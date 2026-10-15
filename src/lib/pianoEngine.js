import {
  PIANO_SAMPLES,
  attackStartIndex,
  playbackRateFor,
  pianoSampleUrl,
  sampleForMidi,
} from './pianoSamples.js';

const bufferCache = new Map();
const pending = new Map();
const graphs = new WeakMap();

function assetBase() {
  const base = import.meta.env?.BASE_URL;
  return typeof base === 'string' && base.length > 0 ? base : './';
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

function loadSample(ctx, sample) {
  const cached = bufferCache.get(sample.file);
  if (cached) return Promise.resolve(cached);
  let job = pending.get(sample.file);
  if (!job) {
    const url = pianoSampleUrl(sample.file, assetBase());
    job = window.fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`piano sample ${sample.file} (${res.status})`);
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr.slice(0)))
      .then((decoded) => {
        const trimmed = trimBuffer(ctx, decoded);
        bufferCache.set(sample.file, trimmed);
        pending.delete(sample.file);
        return trimmed;
      })
      .catch((err) => {
        pending.delete(sample.file);
        throw err;
      });
    pending.set(sample.file, job);
  }
  return job;
}

function graphFor(ctx) {
  let graph = graphs.get(ctx);
  if (graph) return graph;

  const input = ctx.createGain();
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 32;
  highpass.Q.value = 0.7;

  const body = ctx.createBiquadFilter();
  body.type = 'lowshelf';
  body.frequency.value = 190;
  body.gain.value = 2.4;

  const harsh = ctx.createBiquadFilter();
  harsh.type = 'peaking';
  harsh.frequency.value = 3300;
  harsh.Q.value = 0.8;
  harsh.gain.value = -2.4;

  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 7800;
  air.gain.value = -3;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 18;
  comp.ratio.value = 2.4;
  comp.attack.value = 0.006;
  comp.release.value = 0.22;

  const master = ctx.createGain();
  master.gain.value = 0.94;

  input.connect(highpass);
  highpass.connect(body);
  body.connect(harsh);
  harsh.connect(air);
  air.connect(comp);
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
  const fadeAt = when + Math.max(0.08, sustain - 0.14);
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

export function primePiano(ctx) {
  if (!ctx || ctx.state === 'closed') return Promise.resolve();
  graphFor(ctx);
  return Promise.all(PIANO_SAMPLES.map((sample) => loadSample(ctx, sample).catch(() => null)));
}

/**
 * @param {AudioContext} ctx
 * @param {Array<{ midi: number, offset?: number, sustain: number, gain: number }>} specs
 */
export async function schedulePianoNotes(ctx, specs) {
  if (!ctx || ctx.state === 'closed' || !specs?.length) return false;
  const graph = graphFor(ctx);
  await Promise.all(specs.map((spec) => (
    loadSample(ctx, sampleForMidi(spec.midi)).catch(() => null)
  )));
  if (ctx.state === 'closed') return false;
  const origin = ctx.currentTime + 0.004;
  for (const spec of specs) {
    const sample = sampleForMidi(spec.midi);
    const buffer = bufferCache.get(sample.file);
    const when = origin + (spec.offset || 0);
    if (buffer) startSampleVoice(ctx, graph, buffer, sample, { ...spec, when });
    else startSynthVoice(ctx, graph, { ...spec, when });
  }
  return true;
}
