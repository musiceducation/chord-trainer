import { useCallback, useEffect } from 'react';
import { getActivePianoSound, primePiano, schedulePianoNotes, setActivePianoSound } from '../lib/pianoEngine.js';
import { normalizePianoSound } from '../lib/pianoSamples.js';

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

export function usePiano(enabled, pianoSound) {
  const soundId = pianoSound != null ? normalizePianoSound(pianoSound) : null;

  useEffect(() => {
    retainSharedPianoContext();
    if (soundId) setActivePianoSound(soundId);
    const ctx = getSharedPianoContext();
    if (ctx) primePiano(ctx);
    return () => {
      releaseSharedPianoContext();
    };
  }, [soundId]);

  useEffect(() => {
    if (!soundId) return;
    if (getActivePianoSound() === soundId) return;
    setActivePianoSound(soundId);
    const ctx = getSharedPianoContext();
    if (ctx) primePiano(ctx);
  }, [soundId]);

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

  const playChord = useCallback((midis, strumOrOptions = true) => {
    if (!enabled) return false;
    const options = typeof strumOrOptions === 'object' && strumOrOptions
      ? strumOrOptions
      : { strum: strumOrOptions !== false };
    const sustain = Number(options.sustain) > 0 ? Number(options.sustain) : CHORD_SUSTAIN;
    const gain = Number(options.gain) > 0 ? Number(options.gain) : CHORD_GAIN;
    const strum = options.strum !== false;
    try {
      const ctx = getSharedPianoContext();
      if (!ctx) return false;
      const sorted = [...midis].sort((a, b) => a - b);
      return guardPlay(schedulePianoNotes(ctx, sorted.map((midi, i) => ({
        midi,
        offset: strum ? i * STRUM : 0,
        sustain,
        gain,
      }))));
    } catch {
      return false;
    }
  }, [enabled]);

  const playSequence = useCallback(async (chordMidisList, gapMs = 1100, signal = null, options = {}) => {
    if (!enabled) return false;
    try {
      for (let i = 0; i < chordMidisList.length; i += 1) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        await playChord(chordMidisList[i], { strum: true, sustain: options.sustain });
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
