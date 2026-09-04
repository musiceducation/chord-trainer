import { useRef, useCallback, useEffect } from 'react';

const MAX_VOICES = 12;

/** Shared AudioContext across all mode hooks (avoids multiple contexts on iOS). */
let sharedCtx = null;
let sharedUsers = 0;

async function acquireSharedCtx() {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    await sharedCtx.resume();
  }
  return sharedCtx;
}

function releaseSharedCtx() {
  sharedUsers = Math.max(0, sharedUsers - 1);
  if (sharedUsers === 0 && sharedCtx) {
    sharedCtx.close().catch(() => {});
    sharedCtx = null;
  }
}

function isAbortError(err) {
  return err?.name === 'AbortError';
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function usePiano(enabled) {
  const activeVoicesRef = useRef(0);
  const acquiredRef = useRef(false);

  useEffect(() => {
    sharedUsers += 1;
    acquiredRef.current = true;
    return () => {
      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseSharedCtx();
      }
    };
  }, []);

  const ensureCtx = useCallback(async () => acquireSharedCtx(), []);

  const playOne = useCallback((ctx, midi, startOffset = 0, sustain = 1.4, vol = 0.16) => {
    if (activeVoicesRef.current >= MAX_VOICES) return;
    activeVoicesRef.current += 1;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const start = ctx.currentTime + startOffset;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + sustain);
    gain.connect(ctx.destination);

    const nodes = [];
    [1, 2, 3].forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq * h;
      const hg = ctx.createGain();
      hg.gain.value = 1 / (h * 1.8);
      osc.connect(hg).connect(gain);
      osc.start(start);
      osc.stop(start + sustain);
      nodes.push(osc, hg);
    });

    const cleanup = () => {
      nodes.forEach((n) => {
        try { n.disconnect(); } catch { /* noop */ }
      });
      try { gain.disconnect(); } catch { /* noop */ }
      activeVoicesRef.current = Math.max(0, activeVoicesRef.current - 1);
    };
    window.setTimeout(cleanup, (startOffset + sustain + 0.1) * 1000);
  }, []);

  const playNote = useCallback(async (midi) => {
    if (!enabled) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    playOne(ctx, midi);
    return true;
  }, [enabled, ensureCtx, playOne]);

  const playChord = useCallback(async (midis, strum = true) => {
    if (!enabled) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    const sorted = [...midis].sort((a, b) => a - b);
    sorted.forEach((m, i) => {
      playOne(ctx, m, strum ? i * 0.015 : 0, 2.2, 0.14);
    });
    return true;
  }, [enabled, ensureCtx, playOne]);

  const playSequence = useCallback(async (chordMidisList, gapMs = 1100, signal = null) => {
    if (!enabled) return false;
    try {
      for (let i = 0; i < chordMidisList.length; i += 1) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        await playChord(chordMidisList[i], true);
        if (i < chordMidisList.length - 1) {
          await wait(gapMs, signal);
        }
      }
      return true;
    } catch (err) {
      if (isAbortError(err)) return false;
      throw err;
    }
  }, [enabled, playChord]);

  return { playNote, playChord, playSequence };
}
