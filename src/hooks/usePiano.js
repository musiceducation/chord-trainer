import { useRef, useCallback, useEffect } from 'react';
import { primePiano, schedulePianoNotes } from '../lib/pianoEngine.js';

/** Single-key ring. Long enough to hear the hammer and body, short enough for drills. */
const NOTE_SUSTAIN = 1.85;
const NOTE_GAIN = 0.8;
/** Chord ring. Kept close to the previous 2.2s so progression gaps still overlap cleanly. */
const CHORD_SUSTAIN = 2.2;
const CHORD_GAIN = 0.44;
const STRUM = 0.015;

/** Shared AudioContext across all mode hooks (avoids multiple contexts on iOS). */
let sharedCtx = null;
let sharedUsers = 0;

function getOrCreateCtx() {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

async function acquireSharedCtx() {
  const ctx = getOrCreateCtx();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
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
  const acquiredRef = useRef(false);

  useEffect(() => {
    sharedUsers += 1;
    acquiredRef.current = true;
    const ctx = getOrCreateCtx();
    if (ctx) primePiano(ctx);
    return () => {
      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseSharedCtx();
      }
    };
  }, []);

  const ensureCtx = useCallback(async () => acquireSharedCtx(), []);

  const playNote = useCallback(async (midi) => {
    if (!enabled) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    return schedulePianoNotes(ctx, [{
      midi,
      offset: 0,
      sustain: NOTE_SUSTAIN,
      gain: NOTE_GAIN,
    }]);
  }, [enabled, ensureCtx]);

  const playChord = useCallback(async (midis, strum = true) => {
    if (!enabled) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    const sorted = [...midis].sort((a, b) => a - b);
    return schedulePianoNotes(ctx, sorted.map((midi, i) => ({
      midi,
      offset: strum ? i * STRUM : 0,
      sustain: CHORD_SUSTAIN,
      gain: CHORD_GAIN,
    })));
  }, [enabled, ensureCtx]);

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
