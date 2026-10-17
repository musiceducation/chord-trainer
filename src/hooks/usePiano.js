import { useCallback, useEffect } from 'react';
import { primePiano, schedulePianoNotes } from '../lib/pianoEngine.js';

/** Single-key ring. Long enough to hear hammer, body and decay while drilling. */
const NOTE_SUSTAIN = 3.0;
const NOTE_GAIN = 0.78;
/** Chord ring. Inner voices stay audible after the attack; progression gaps still overlap. */
const CHORD_SUSTAIN = 3.5;
const CHORD_GAIN = 0.4;
const STRUM = 0.015;

/**
 * Shared AudioContext across all mode hooks (avoids multiple contexts on iOS).
 * StrictMode runs effect cleanup and setup synchronously. Closing in that
 * cleanup throws away a context that is still decoding, so the close waits
 * until the next turn and is cancelled if a hook still holds the context.
 */
let sharedCtx = null;
let sharedUsers = 0;
let closeTimer = null;

function publishSharedContext() {
  if (!import.meta.env?.DEV || typeof window === 'undefined') return;
  try {
    window.__pianoGetContext = () => sharedCtx;
  } catch {
    /* debug hook is best-effort */
  }
}

export function getSharedPianoContext() {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    cancelScheduledClose();
    sharedCtx = new AudioCtx();
    publishSharedContext();
  }
  return sharedCtx;
}

function cancelScheduledClose() {
  if (closeTimer != null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

export function retainSharedPianoContext() {
  cancelScheduledClose();
  sharedUsers += 1;
}

export function releaseSharedPianoContext() {
  sharedUsers = Math.max(0, sharedUsers - 1);
  if (sharedUsers > 0 || !sharedCtx) return;
  const ctx = sharedCtx;
  cancelScheduledClose();
  closeTimer = setTimeout(() => {
    closeTimer = null;
    if (sharedUsers === 0 && sharedCtx === ctx) {
      sharedCtx = null;
      publishSharedContext();
      ctx.close().catch(() => {});
    }
  }, 0);
}

export function resetSharedPianoContextForTests() {
  cancelScheduledClose();
  sharedUsers = 0;
  if (sharedCtx && sharedCtx.state !== 'closed' && typeof sharedCtx.close === 'function') {
    sharedCtx.close().catch(() => {});
  }
  sharedCtx = null;
}

function guardPlay(pending) {
  if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  return pending;
}

export function usePiano(enabled) {
  useEffect(() => {
    retainSharedPianoContext();
    const ctx = getSharedPianoContext();
    if (ctx) primePiano(ctx);
    return () => {
      releaseSharedPianoContext();
    };
  }, []);

  const playNote = useCallback((midi) => {
    if (!enabled) return false;
    try {
      const ctx = getSharedPianoContext();
      if (!ctx) return false;
      return guardPlay(schedulePianoNotes(ctx, [{
        midi,
        offset: 0,
        sustain: NOTE_SUSTAIN,
        gain: NOTE_GAIN,
      }]));
    } catch {
      return false;
    }
  }, [enabled]);

  const playChord = useCallback((midis, strum = true) => {
    if (!enabled) return false;
    try {
      const ctx = getSharedPianoContext();
      if (!ctx) return false;
      const sorted = [...midis].sort((a, b) => a - b);
      return guardPlay(schedulePianoNotes(ctx, sorted.map((midi, i) => ({
        midi,
        offset: strum ? i * STRUM : 0,
        sustain: CHORD_SUSTAIN,
        gain: CHORD_GAIN,
      }))));
    } catch {
      return false;
    }
  }, [enabled]);

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
