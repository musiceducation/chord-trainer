import { afterEach, describe, expect, it, vi } from 'vitest';
import { PIANO_SAMPLES } from '../lib/pianoSamples.js';
import {
  getPianoDebugState,
  getPianoScheduleTrace,
  installDecodedSampleForTests,
  installPrefetchedSampleForTests,
  playbackStartTime,
  prefetchPianoSamples,
  primePiano,
  renderQuantumSeconds,
  resetPianoEngineForTests,
  schedulePianoNotes,
} from '../lib/pianoEngine.js';
import {
  getSharedPianoContext,
  releaseSharedPianoContext,
  resetSharedPianoContextForTests,
  retainSharedPianoContext,
} from '../hooks/usePiano.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function param(value = 0) {
  return {
    value,
    setValueAtTime(next) { this.value = next; },
    exponentialRampToValueAtTime(next) { this.value = next; },
    cancelScheduledValues() {},
  };
}

function port() {
  return { connect() {}, disconnect() {} };
}

function fakeBuffer(tag, length = 4800) {
  const data = new Float32Array(length);
  data[Math.min(10, length - 1)] = 0.5;
  return {
    tag,
    numberOfChannels: 1,
    length,
    sampleRate: 48000,
    getChannelData() { return data; },
  };
}

function makeCtx({ state = 'running', currentTime = 0, sampleRate = 48000 } = {}) {
  const ctx = {
    state,
    currentTime,
    sampleRate,
    destination: {},
    resumeCalls: 0,
    starts: [],
    oscStarts: [],
    decodeCalls: 0,
    createGain() {
      return { ...port(), gain: param(1) };
    },
    createBiquadFilter() {
      return {
        ...port(),
        type: 'peaking',
        frequency: param(),
        Q: param(),
        gain: param(),
      };
    },
    createDynamicsCompressor() {
      return {
        ...port(),
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
      };
    },
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        getChannelData(channel) { return data[channel]; },
      };
    },
    createBufferSource() {
      const source = {
        ...port(),
        buffer: null,
        playbackRate: param(1),
        onended: null,
        start(when) {
          ctx.starts.push({ when, buffer: source.buffer });
        },
        stop() {},
      };
      return source;
    },
    createOscillator() {
      const osc = {
        ...port(),
        type: 'sine',
        frequency: param(),
        detune: param(),
        start(when) { ctx.oscStarts.push(when); },
        stop() {},
      };
      return osc;
    },
    decodeAudioData() {
      ctx.decodeCalls += 1;
      return Promise.resolve(fakeBuffer('decoded'));
    },
    resume() {
      ctx.resumeCalls += 1;
      return Promise.resolve();
    },
    addEventListener(type, fn) {
      if (type !== 'statechange') return;
      ctx.listeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type !== 'statechange') return;
      ctx.listeners.delete(fn);
    },
    dispatchState() {
      [...ctx.listeners].forEach((fn) => fn());
    },
    listeners: new Set(),
  };
  return ctx;
}

function noteStarts(ctx) {
  return ctx.starts.filter((entry) => entry.buffer?.tag);
}

function silenceStarts(ctx) {
  return ctx.starts.filter((entry) => entry.buffer?.length === 1);
}

function seedPrefetch() {
  for (const sample of PIANO_SAMPLES) installPrefetchedSampleForTests(sample.file);
}

async function flush(times = 8) {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

const originalWindow = globalThis.window;

afterEach(() => {
  resetPianoEngineForTests();
  resetSharedPianoContextForTests();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  vi.useRealTimers();
});

describe('playbackStartTime', () => {
  it('uses the frozen clock while suspended and one quantum while running', () => {
    const suspended = { state: 'suspended', currentTime: 1.5, sampleRate: 48000 };
    const running = { state: 'running', currentTime: 1.5, sampleRate: 48000 };
    expect(playbackStartTime(suspended)).toBe(1.5);
    expect(playbackStartTime(running)).toBeCloseTo(1.5 + (128 / 48000), 8);
    expect(renderQuantumSeconds(running)).toBeLessThan(0.015);
    expect(renderQuantumSeconds(running)).toBeGreaterThan(0);
  });
});

describe('schedulePianoNotes', () => {
  it('starts a cached note synchronously, inside one render quantum', () => {
    const ctx = makeCtx({ state: 'running', currentTime: 2, sampleRate: 48000 });
    installDecodedSampleForTests('C4.m4a', fakeBuffer('C4.m4a'));
    let started = false;
    const original = ctx.createBufferSource;
    ctx.createBufferSource = () => {
      const source = original();
      const start = source.start.bind(source);
      source.start = (when) => {
        if (source.buffer?.tag === 'C4.m4a') started = true;
        start(when);
      };
      return source;
    };

    const pending = schedulePianoNotes(ctx, [{
      midi: 60, offset: 0, sustain: 1.85, gain: 0.8,
    }]);

    expect(started).toBe(true);
    const notes = noteStarts(ctx);
    expect(notes).toHaveLength(1);
    expect(notes[0].when).toBeCloseTo(2 + (128 / 48000), 8);
    expect(ctx.resumeCalls).toBe(0);
    expect(ctx.decodeCalls).toBe(0);
    const trace = getPianoScheduleTrace().find((entry) => entry.mode === 'cached');
    expect(trace.jsUntilStartMs).toBeLessThan(15);
    expect(trace.lookaheadMs).toBeCloseTo((128 / 48000) * 1000, 5);
    return pending.then((ok) => {
      expect(ok).toBe(true);
    });
  });

  it('starts a second cached tap on the same synchronous path', () => {
    const ctx = makeCtx({ state: 'running', currentTime: 3, sampleRate: 44100 });
    installDecodedSampleForTests('C4.m4a', fakeBuffer('C4.m4a'));
    schedulePianoNotes(ctx, [{ midi: 60, offset: 0, sustain: 1.85, gain: 0.8 }]);
    ctx.currentTime = 3.2;
    schedulePianoNotes(ctx, [{ midi: 60, offset: 0, sustain: 1.85, gain: 0.8 }]);
    const notes = noteStarts(ctx);
    expect(notes).toHaveLength(2);
    expect(notes[1].when).toBeCloseTo(3.2 + (128 / 44100), 8);
    const cached = getPianoScheduleTrace().filter((entry) => entry.mode === 'cached');
    expect(cached).toHaveLength(2);
    expect(cached[1].jsUntilStartMs).toBeLessThan(15);
    expect(silenceStarts(ctx)).toHaveLength(1);
  });

  it('resumes and starts a cached note in the suspended gesture without extra lookahead', () => {
    const ctx = makeCtx({ state: 'suspended', currentTime: 0, sampleRate: 48000 });
    let resumeObservedStart = false;
    ctx.resume = () => {
      ctx.resumeCalls += 1;
      return new Promise(() => {});
    };
    installDecodedSampleForTests('A4.m4a', fakeBuffer('A4.m4a'));
    const original = ctx.createBufferSource;
    ctx.createBufferSource = () => {
      const source = original();
      const start = source.start.bind(source);
      source.start = (when) => {
        if (source.buffer?.tag === 'A4.m4a') resumeObservedStart = ctx.resumeCalls > 0;
        start(when);
      };
      return source;
    };

    schedulePianoNotes(ctx, [{ midi: 69, offset: 0, sustain: 1.85, gain: 0.8 }]);

    expect(ctx.resumeCalls).toBe(1);
    expect(resumeObservedStart).toBe(true);
    expect(ctx.state).toBe('suspended');
    const notes = noteStarts(ctx);
    expect(notes).toHaveLength(1);
    expect(notes[0].when).toBe(0);
    expect(silenceStarts(ctx)).toHaveLength(1);
    const trace = getPianoScheduleTrace().find((entry) => entry.mode === 'cached');
    expect(trace.resumed).toBe(true);
    expect(trace.lookaheadMs).toBe(0);
    expect(trace.jsUntilStartMs).toBeLessThan(15);
    expect(ctx.decodeCalls).toBe(0);
  });

  it('starts a cached chord together, with a 15ms strum', () => {
    const ctx = makeCtx({ state: 'running', currentTime: 1, sampleRate: 48000 });
    installDecodedSampleForTests('C4.m4a', fakeBuffer('C4'));
    installDecodedSampleForTests('Ds4.m4a', fakeBuffer('Ds4'));
    installDecodedSampleForTests('Fs4.m4a', fakeBuffer('Fs4'));
    const origin = 1 + (128 / 48000);
    let notesAtReturn = 0;
    const pending = schedulePianoNotes(ctx, [
      { midi: 60, offset: 0, sustain: 2.2, gain: 0.44 },
      { midi: 64, offset: 0.015, sustain: 2.2, gain: 0.44 },
      { midi: 67, offset: 0.03, sustain: 2.2, gain: 0.44 },
    ]);
    notesAtReturn = noteStarts(ctx).length;
    expect(notesAtReturn).toBe(3);
    const whens = noteStarts(ctx).map((entry) => entry.when);
    expect(whens[0]).toBeCloseTo(origin, 8);
    expect(whens[1]).toBeCloseTo(origin + 0.015, 8);
    expect(whens[2]).toBeCloseTo(origin + 0.03, 8);
    return pending.then((ok) => expect(ok).toBe(true));
  });

  it('does not start an undecoded note synchronously, and does not wait for the other files', async () => {
    const ctx = makeCtx({ state: 'suspended', currentTime: 0.25, sampleRate: 48000 });
    seedPrefetch();
    const gates = [];
    ctx.resume = () => {
      ctx.resumeCalls += 1;
      return new Promise(() => {});
    };
    ctx.decodeAudioData = () => {
      const gate = deferred();
      gates.push(gate);
      return gate.promise.then(() => {
        ctx.currentTime = 0.9;
        ctx.state = 'running';
        return fakeBuffer('decoded-note');
      });
    };

    let notesDuringCall = -1;
    const pending = schedulePianoNotes(ctx, [{
      midi: 60, offset: 0, sustain: 1.85, gain: 0.8,
    }]);
    notesDuringCall = noteStarts(ctx).length;

    expect(ctx.resumeCalls).toBe(1);
    expect(notesDuringCall).toBe(0);
    expect(silenceStarts(ctx).length).toBeGreaterThan(0);
    const waited = getPianoScheduleTrace().find((entry) => entry.mode === 'wait');
    expect(waited.resumed).toBe(true);
    expect(waited.queuedMs).toBeLessThan(15);
    expect(waited.decoded).toBe(0);

    await flush(20);
    expect(gates.length).toBeGreaterThan(0);
    const queuedBeforeFirst = gates.length;
    gates[0].resolve();
    const ok = await pending;
    expect(ok).toBe(true);
    expect(noteStarts(ctx)).toHaveLength(1);
    expect(noteStarts(ctx)[0].when).toBeCloseTo(0.9 + (128 / 48000), 8);
    expect(queuedBeforeFirst).toBeGreaterThan(1);
    expect(gates.slice(1).every((gate) => gate.promise)).toBe(true);
    const started = getPianoScheduleTrace().find((entry) => entry.mode === 'pending');
    expect(started.file).toBe('C4.m4a');
    expect(started.decoded).toBe(1);
  });

  it('after a suspended decode refusal, resumes in the gesture and decodes the tapped note first', async () => {
    const ctx = makeCtx({ state: 'suspended', currentTime: 0, sampleRate: 48000 });
    seedPrefetch();
    globalThis.window = { fetch: vi.fn() };
    ctx.decodeAudioData = () => Promise.reject(new Error('suspended'));
    ctx.resume = () => {
      ctx.resumeCalls += 1;
      return Promise.resolve();
    };

    await primePiano(ctx);
    expect(ctx.resumeCalls).toBe(0);
    expect(getPianoDebugState().decodeWhileSuspendedFailed).toBe(true);
    expect(getPianoDebugState().decoded).toEqual([]);

    const gates = [];
    const resumeGate = deferred();
    ctx.resume = () => {
      ctx.resumeCalls += 1;
      return resumeGate.promise.then(() => {
        ctx.state = 'running';
        ctx.currentTime = 0.4;
        ctx.dispatchState();
      });
    };
    ctx.decodeAudioData = () => {
      const gate = deferred();
      gates.push(gate);
      return gate.promise.then(() => fakeBuffer(`decoded-${gates.length}`));
    };

    const pending = schedulePianoNotes(ctx, [{
      midi: 72, offset: 0, sustain: 1.85, gain: 0.8,
    }]);
    expect(ctx.resumeCalls).toBe(1);
    expect(noteStarts(ctx)).toHaveLength(0);
    await flush(12);
    expect(gates).toHaveLength(0);

    resumeGate.resolve();
    await flush(12);
    expect(gates.length).toBeGreaterThan(0);
    gates[0].resolve();
    const ok = await pending;
    expect(ok).toBe(true);
    expect(noteStarts(ctx)).toHaveLength(1);
    expect(noteStarts(ctx)[0].when).toBeCloseTo(0.4 + (128 / 48000), 8);
    expect(getPianoScheduleTrace().some((entry) => entry.mode === 'pending' && entry.file === 'C5.m4a')).toBe(true);
  });

  it('falls back to the synth when decode fails on a running context', async () => {
    const ctx = makeCtx({ state: 'running', currentTime: 0.2, sampleRate: 48000 });
    seedPrefetch();
    ctx.decodeAudioData = () => Promise.reject(new Error('bad file'));
    const ok = await schedulePianoNotes(ctx, [{
      midi: 60, offset: 0, sustain: 1, gain: 0.8,
    }]);
    expect(ok).toBe(true);
    expect(ctx.oscStarts.length).toBeGreaterThan(0);
    expect(getPianoScheduleTrace().some((entry) => entry.mode === 'synth')).toBe(true);
  });

  it('prefetches array buffers without an AudioContext', async () => {
    const fetch = vi.fn(async (url) => ({
      ok: true,
      arrayBuffer: async () => {
        const buf = new ArrayBuffer(8);
        buf.url = String(url);
        return buf;
      },
    }));
    globalThis.window = { fetch };
    prefetchPianoSamples();
    await flush(20);
    const prefetched = getPianoDebugState().prefetched;
    expect(prefetched).toHaveLength(PIANO_SAMPLES.length);
    expect(fetch).toHaveBeenCalledTimes(PIANO_SAMPLES.length);
    expect(String(fetch.mock.calls[0][0])).toContain('C2.m4a');
  });
});

describe('shared AudioContext lifetime', () => {
  function installAudio() {
    globalThis.window = {
      AudioContext: class FakeAudioContext {
        constructor() {
          this.state = 'running';
          this.sampleRate = 48000;
          this.currentTime = 0;
          this.closeCalls = 0;
        }

        close() {
          this.state = 'closed';
          this.closeCalls += 1;
          return Promise.resolve();
        }
      },
    };
  }

  it('does not close on a synchronous release/retain, and does close after a real unmount', async () => {
    vi.useFakeTimers();
    installAudio();
    retainSharedPianoContext();
    retainSharedPianoContext();
    retainSharedPianoContext();
    const ctx = getSharedPianoContext();
    releaseSharedPianoContext();
    releaseSharedPianoContext();
    releaseSharedPianoContext();
    expect(ctx.state).toBe('running');
    retainSharedPianoContext();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.closeCalls).toBe(0);
    expect(getSharedPianoContext()).toBe(ctx);

    releaseSharedPianoContext();
    expect(ctx.state).toBe('running');
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.state).toBe('closed');
    expect(ctx.closeCalls).toBe(1);
    const next = getSharedPianoContext();
    expect(next).not.toBe(ctx);
    expect(next.state).toBe('running');
  });

  it('keeps the context while any mode hook still holds it', async () => {
    vi.useFakeTimers();
    installAudio();
    retainSharedPianoContext();
    retainSharedPianoContext();
    const ctx = getSharedPianoContext();
    releaseSharedPianoContext();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.closeCalls).toBe(0);
  });
});
