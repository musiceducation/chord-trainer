import {
  PIANO_SAMPLES,
  attackStartIndex,
  playbackRateFor,
  pianoSampleUrl,
  sampleForMidi,
} from './pianoSamples.js';

const bufferCache = new Map();
const pending = new Map();
const rawCache = new Map();
const rawPending = new Map();
const graphs = new WeakMap();
const resumePromises = new WeakMap();
let unlockedContexts = new WeakSet();
let decodeWhileSuspendedFailed = false;
const recentSchedules = [];

/**
 * Playback tone for Salamander, tuned toward a GarageBand Steinway feel.
 * Samples stay untouched; this chain is applied live.
 * Tuned warmer after a C4 / C-major listen: more low-mid body,
 * less 3–5 kHz presence, and a softer top.
 */
export const PIANO_TONE = {
  masterGain: 0.88,
  filters: [
    { id: 'highpass', type: 'highpass', frequency: 30, Q: 0.7 },
    // Extra low shelf vs the prior Salamander curve — closer to GB Steinway body.
    { id: 'body', type: 'lowshelf', frequency: 240, gain: 5.2 },
    { id: 'lowMid', type: 'peaking', frequency: 380, Q: 0.75, gain: 3.0 },
    { id: 'presence', type: 'peaking', frequency: 3600, Q: 0.9, gain: -5.2 },
    { id: 'upper', type: 'peaking', frequency: 5000, Q: 1.1, gain: -3.5 },
    { id: 'air', type: 'highshelf', frequency: 6200, gain: -7.0 },
  ],
};

function nowMs() {
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') return perf.now();
  return Date.now();
}

function createToneFilter(ctx, spec) {
  const filter = ctx.createBiquadFilter();
  filter.type = spec.type;
  filter.frequency.value = spec.frequency;
  if (spec.Q != null) filter.Q.value = spec.Q;
  if (spec.gain != null) filter.gain.value = spec.gain;
  return filter;
}

function assetBase() {
  const base = import.meta.env?.BASE_URL;
  return typeof base === 'string' && base.length > 0 ? base : './';
}

/** One Web Audio render quantum (128 frames). The longest lookahead we add. */
export function renderQuantumSeconds(ctx) {
  const rate = ctx?.sampleRate > 0 ? ctx.sampleRate : 44100;
  return 128 / rate;
}

/**
 * While suspended, currentTime is frozen — start at that time so the note
 * begins as soon as the context runs. While running, land in the next block.
 */
export function playbackStartTime(ctx) {
  const now = Number.isFinite(ctx?.currentTime) ? ctx.currentTime : 0;
  if (!ctx || ctx.state === 'suspended') return now;
  return now + renderQuantumSeconds(ctx);
}

function publishDebug() {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return;
  try {
    window.__pianoScheduleTrace = recentSchedules;
    window.__pianoDebug = getPianoDebugState();
    window.__pianoForgetDecoded = () => {
      bufferCache.clear();
      pending.clear();
      publishDebug();
    };
  } catch {
    /* debug hook is best-effort */
  }
}

function recordSchedule(entry) {
  if (!import.meta.env?.DEV) return;
  recentSchedules.push(entry);
  if (recentSchedules.length > 32) recentSchedules.shift();
  publishDebug();
}

export function getPianoScheduleTrace() {
  return recentSchedules.slice();
}

export function getPianoDebugState() {
  return {
    decoded: [...bufferCache.keys()],
    prefetched: [...rawCache.keys()],
    pendingDecodes: [...pending.keys()],
    decodeWhileSuspendedFailed,
    trace: recentSchedules.slice(),
  };
}

function trimBuffer(ctx, buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    channels.push(buffer.getChannelData(c));
  }
  const start = attackStartIndex(channels, buffer.sampleRate);
  if (start <= 0) return buffer;
  const length = buffer.length - start;
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    out.getChannelData(c).set(channels[c].subarray(start));
  }
  return out;
}

function prefetchSample(sample) {
  const cached = rawCache.get(sample.file);
  if (cached) return Promise.resolve(cached);
  const existing = rawPending.get(sample.file);
  if (existing) return existing;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return Promise.reject(new Error('piano prefetch unavailable'));
  }
  const url = pianoSampleUrl(sample.file, assetBase());
  const job = window.fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`piano sample ${sample.file} (${res.status})`);
      return res.arrayBuffer();
    })
    .then((arr) => {
      rawCache.set(sample.file, arr);
      publishDebug();
      return arr;
    })
    .finally(() => {
      if (rawPending.get(sample.file) === job) rawPending.delete(sample.file);
    });
  rawPending.set(sample.file, job);
  return job;
}

/** Download every m4a without an AudioContext or a user gesture. */
export function prefetchPianoSamples() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  for (const sample of PIANO_SAMPLES) {
    prefetchSample(sample).catch(() => {});
  }
}

prefetchPianoSamples();

function isClosed(ctx) {
  return !ctx || ctx.state === 'closed';
}

async function decodeArrayBuffer(ctx, raw) {
  const decoded = await ctx.decodeAudioData(raw.slice(0));
  if (isClosed(ctx)) throw new Error('AudioContext closed');
  const trimmed = trimBuffer(ctx, decoded);
  return trimmed;
}

function waitUntilRunning(ctx) {
  if (ctx.state === 'running') return Promise.resolve();
  if (ctx.state === 'closed') return Promise.reject(new Error('AudioContext closed'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (ctx.state === 'running') {
        settled = true;
        cleanup();
        resolve();
      } else if (ctx.state === 'closed') {
        settled = true;
        cleanup();
        reject(new Error('AudioContext closed'));
      }
    };
    const fail = (err) => {
      if (settled || ctx.state === 'running') {
        finish();
        return;
      }
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error('AudioContext resume failed'));
    };
    const previousStateHandler = ctx.onstatechange;
    let stateHandler = null;
    const cleanup = () => {
      if (typeof ctx.removeEventListener === 'function') {
        ctx.removeEventListener('statechange', finish);
      }
      if (stateHandler && ctx.onstatechange === stateHandler) {
        ctx.onstatechange = previousStateHandler;
      }
    };
    if (typeof ctx.addEventListener === 'function') {
      ctx.addEventListener('statechange', finish);
    } else if ('onstatechange' in ctx || ctx.onstatechange !== undefined) {
      stateHandler = (event) => {
        if (typeof previousStateHandler === 'function') previousStateHandler(event);
        finish();
      };
      ctx.onstatechange = stateHandler;
    }
    const resumePromise = resumePromises.get(ctx);
    if (resumePromise && typeof resumePromise.then === 'function') {
      resumePromise.then(() => finish(), fail);
    }
  });
}

async function decodeSample(ctx, sample, options) {
  const raw = await prefetchSample(sample);
  if (isClosed(ctx)) throw new Error('AudioContext closed');

  // Suspended decode already failed. Background prime must not hold the slot
  // (or call resume()). The tapped note, and a prime started from that tap,
  // wait until the gesture's resume() actually starts the context.
  if (decodeWhileSuspendedFailed && ctx.state === 'suspended') {
    if (!options.priority && !options.followResume) {
      throw new Error('decode deferred until AudioContext is running');
    }
    await waitUntilRunning(ctx);
    if (isClosed(ctx)) throw new Error('AudioContext closed');
  }

  try {
    const trimmed = await decodeArrayBuffer(ctx, raw);
    bufferCache.set(sample.file, trimmed);
    publishDebug();
    return trimmed;
  } catch (err) {
    if (ctx.state !== 'suspended') throw err;
    decodeWhileSuspendedFailed = true;
    publishDebug();
    if (!options.priority) throw err;
    await waitUntilRunning(ctx);
    if (isClosed(ctx)) throw err;
    const trimmed = await decodeArrayBuffer(ctx, raw);
    bufferCache.set(sample.file, trimmed);
    publishDebug();
    return trimmed;
  }
}

function loadSample(ctx, sample, options = {}) {
  const cached = bufferCache.get(sample.file);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(sample.file);
  if (existing) return existing;

  const job = decodeSample(ctx, sample, options).finally(() => {
    if (pending.get(sample.file) === job) pending.delete(sample.file);
  });
  pending.set(sample.file, job);
  return job;
}

function graphFor(ctx) {
  let graph = graphs.get(ctx);
  if (graph) return graph;

  const input = ctx.createGain();
  const filters = PIANO_TONE.filters.map((spec) => createToneFilter(ctx, spec));

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 18;
  comp.ratio.value = 2.4;
  comp.attack.value = 0.006;
  comp.release.value = 0.22;

  const master = ctx.createGain();
  master.gain.value = PIANO_TONE.masterGain;

  let node = input;
  for (const filter of filters) {
    node.connect(filter);
    node = filter;
  }
  node.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);

  graph = { input, voices: [] };
  graphs.set(ctx, graph);
  return graph;
}

function dropVoice(graph, voice) {
  const index = graph.voices.indexOf(voice);
  if (index >= 0) graph.voices.splice(index, 1);
  try { voice.gain.disconnect(); } catch { /* already disconnected */ }
  for (const node of voice.nodes) {
    try { node.disconnect(); } catch { /* already disconnected */ }
  }
}

function releaseVoice(voice, at, fade = 0.035) {
  if (voice.releasing) return;
  voice.releasing = true;
  try {
    const { gain } = voice;
    gain.gain.cancelScheduledValues(at);
    const current = Math.max(gain.gain.value, 0.001);
    gain.gain.setValueAtTime(current, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + fade);
    const stopAt = at + fade + 0.01;
    for (const node of voice.nodes) {
      try { node.stop(stopAt); } catch { /* not a source, or already stopped */ }
    }
  } catch { /* voice already ended */ }
}

function stealIfNeeded(graph, ctx, midi) {
  const now = ctx.currentTime;
  for (const voice of graph.voices) {
    if (voice.midi === midi) releaseVoice(voice, now, 0.028);
  }
  const live = () => graph.voices.filter((voice) => !voice.releasing);
  while (live().length >= 16) {
    releaseVoice(live()[0], now, 0.04);
  }
}

function startSampleVoice(ctx, graph, buffer, sample, spec) {
  const { midi, when, sustain, gain: vol } = spec;
  stealIfNeeded(graph, ctx, midi);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRateFor(midi, sample.midi), when);
  const gain = ctx.createGain();
  const level = Math.max(0.001, vol * sample.gain);
  gain.gain.setValueAtTime(level, when);
  const release = Math.min(0.45, Math.max(0.2, sustain * 0.14));
  const fadeAt = when + Math.max(0.12, sustain - release);
  gain.gain.setValueAtTime(level, fadeAt);
  gain.gain.exponentialRampToValueAtTime(0.001, when + sustain);
  source.connect(gain);
  gain.connect(graph.input);
  source.start(when);
  source.stop(when + sustain + 0.02);
  const voice = { midi, gain, nodes: [source], releasing: false };
  graph.voices.push(voice);
  source.onended = () => dropVoice(graph, voice);
}

/**
 * Additive fallback used only when a sample cannot be decoded.
 * Inharmonic partials plus a short hammer-noise burst — warmer than a
 * bare triangle wave, still immediate.
 */
function startSynthVoice(ctx, graph, spec) {
  const { midi, when, sustain, gain: vol } = spec;
  stealIfNeeded(graph, ctx, midi);
  const freq = 440 * (2 ** ((midi - 69) / 12));
  const gain = ctx.createGain();
  const level = Math.max(0.001, vol * 0.55);
  gain.gain.setValueAtTime(0.001, when);
  gain.gain.exponentialRampToValueAtTime(level, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(level * 0.45, when + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.001, when + sustain);
  gain.connect(graph.input);

  const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * 0.035));
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i += 1) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.007));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = Math.min(3200, freq * 5);
  band.Q.value = 0.65;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.22;
  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(gain);
  noise.start(when);
  noise.stop(when + 0.04);

  const sources = [noise];
  const B = 0.00025;
  let fundamental = null;
  for (let n = 1; n <= 6; n += 1) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * n * Math.sqrt(1 + B * n * n);
    osc.detune.value = n % 2 === 0 ? 1.4 : -1.1;
    const partial = ctx.createGain();
    const amp = 0.62 / (n ** 1.4);
    const decay = Math.max(0.12, sustain * (0.62 / Math.sqrt(n)));
    partial.gain.setValueAtTime(0.001, when);
    partial.gain.exponentialRampToValueAtTime(amp, when + 0.008);
    partial.gain.exponentialRampToValueAtTime(0.001, when + decay);
    osc.connect(partial);
    partial.connect(gain);
    osc.start(when);
    osc.stop(when + sustain);
    sources.push(osc);
    if (n === 1) fundamental = osc;
  }

  const voice = { midi, gain, nodes: sources, releasing: false };
  graph.voices.push(voice);
  fundamental.onended = () => dropVoice(graph, voice);
}

/**
 * resume() has to be invoked inside the gesture, before any await.
 * A 1-frame silent buffer satisfies WKWebView's "something must start"
 * rule without an audible click. Repeated while suspended so a timer
 * cannot consume the only unlock.
 */
function unlockAudioContext(ctx) {
  if (!ctx || ctx.state === 'closed') return false;
  let resumed = false;
  if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
    resumed = true;
    try {
      const pendingResume = ctx.resume();
      if (pendingResume && typeof pendingResume.then === 'function') {
        resumePromises.set(ctx, pendingResume);
        pendingResume.catch(() => {});
      }
    } catch {
      /* a later tap can try again */
    }
  }
  const stillSuspended = ctx.state === 'suspended';
  if (stillSuspended || !unlockedContexts.has(ctx)) {
    startSilentBuffer(ctx);
    if (!stillSuspended) unlockedContexts.add(ctx);
  }
  return resumed;
}

function startSilentBuffer(ctx) {
  try {
    const rate = ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
    const silence = ctx.createBuffer(1, 1, rate);
    const channel = silence.getChannelData(0);
    if (channel) channel[0] = 0;
    const source = ctx.createBufferSource();
    source.buffer = silence;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  } catch {
    /* leave the context locked so the next gesture retries */
  }
}

function startWhenReady(ctx, graph, spec, sample, startedAt, resumed) {
  return loadSample(ctx, sample, { priority: true }).catch(() => {
    if (isClosed(ctx)) return null;
    return loadSample(ctx, sample, { priority: true });
  }).then((buffer) => {
    if (!buffer || isClosed(ctx)) return false;
    const when = playbackStartTime(ctx) + (spec.offset || 0);
    startSampleVoice(ctx, graph, buffer, sample, { ...spec, when });
    recordSchedule({
      mode: 'pending',
      file: sample.file,
      midi: spec.midi,
      jsUntilStartMs: nowMs() - startedAt,
      lookaheadMs: (when - (Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0)) * 1000,
      resumed,
      state: ctx.state,
      decoded: bufferCache.size,
    });
    return true;
  }).catch(() => {
    if (isClosed(ctx)) return false;
    try {
      const when = playbackStartTime(ctx) + (spec.offset || 0);
      startSynthVoice(ctx, graph, { ...spec, when });
      recordSchedule({
        mode: 'synth',
        file: sample.file,
        midi: spec.midi,
        jsUntilStartMs: nowMs() - startedAt,
        resumed,
        state: ctx.state,
        decoded: bufferCache.size,
      });
      return true;
    } catch {
      return false;
    }
  });
}

export function primePiano(ctx, options = {}) {
  if (!ctx || ctx.state === 'closed') return Promise.resolve();
  try {
    graphFor(ctx);
  } catch {
    /* graph is rebuilt on the next play */
  }
  const followResume = Boolean(options.followResume);
  return Promise.all(PIANO_SAMPLES.map((sample) => (
    loadSample(ctx, sample, { followResume }).catch(() => null)
  )));
}

/**
 * @param {AudioContext} ctx
 * @param {Array<{ midi: number, offset?: number, sustain: number, gain: number }>} specs
 * Starts every already-decoded note before returning. Does not await resume()
 * or a cache hit. Missing samples start later, at the context's then-current time.
 */
export function schedulePianoNotes(ctx, specs) {
  if (!ctx || ctx.state === 'closed' || !specs?.length) return Promise.resolve(false);
  const startedAt = nowMs();
  const resumed = unlockAudioContext(ctx);
  let graph;
  try {
    graph = graphFor(ctx);
  } catch {
    return Promise.resolve(false);
  }

  const ready = [];
  const waiting = [];
  for (const spec of specs) {
    const sample = sampleForMidi(spec.midi);
    const buffer = bufferCache.get(sample.file);
    if (buffer) ready.push({ spec, sample, buffer });
    else waiting.push({ spec, sample });
  }

  const origin = playbackStartTime(ctx);
  const clock = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
  for (const item of ready) {
    const when = origin + (item.spec.offset || 0);
    startSampleVoice(ctx, graph, item.buffer, item.sample, { ...item.spec, when });
  }
  if (ready.length) {
    recordSchedule({
      mode: waiting.length ? 'partial' : 'cached',
      jsUntilStartMs: nowMs() - startedAt,
      lookaheadMs: (origin - clock) * 1000,
      resumed,
      state: ctx.state,
      ready: ready.length,
      waiting: waiting.length,
      decoded: bufferCache.size,
    });
  } else if (waiting.length) {
    recordSchedule({
      mode: 'wait',
      jsUntilStartMs: null,
      queuedMs: nowMs() - startedAt,
      resumed,
      state: ctx.state,
      ready: 0,
      waiting: waiting.length,
      decoded: bufferCache.size,
    });
  }

  if (waiting.length === 0) return Promise.resolve(true);

  // Queue the tapped files first so their decodeAudioData runs before the
  // rest of the set. primePiano dedupes anything already pending.
  const jobs = waiting.map((item) => (
    startWhenReady(ctx, graph, item.spec, item.sample, startedAt, resumed)
  ));
  primePiano(ctx, { followResume: true });
  return Promise.all(jobs).then((results) => results.some(Boolean));
}

export function installDecodedSampleForTests(file, buffer) {
  bufferCache.set(file, buffer);
}

export function installPrefetchedSampleForTests(file, arrayBuffer = new ArrayBuffer(8)) {
  rawCache.set(file, arrayBuffer);
}

export function resetPianoEngineForTests() {
  bufferCache.clear();
  pending.clear();
  rawCache.clear();
  rawPending.clear();
  unlockedContexts = new WeakSet();
  decodeWhileSuspendedFailed = false;
  recentSchedules.length = 0;
}
