import { useRef, useCallback, useEffect } from 'react';

const MAX_VOICES = 12;

export function usePiano(enabled, audioUnlocked) {
  const ctxRef = useRef(null);
  const activeVoicesRef = useRef(0);

  const ensureCtx = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);

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
    if (!enabled || !audioUnlocked) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    playOne(ctx, midi);
    return true;
  }, [enabled, audioUnlocked, ensureCtx, playOne]);

  const playChord = useCallback(async (midis, strum = true) => {
    if (!enabled || !audioUnlocked) return false;
    const ctx = await ensureCtx();
    if (!ctx) return false;
    const sorted = [...midis].sort((a, b) => a - b);
    sorted.forEach((m, i) => {
      playOne(ctx, m, strum ? i * 0.015 : 0, 2.2, 0.14);
    });
    return true;
  }, [enabled, audioUnlocked, ensureCtx, playOne]);

  const unlock = useCallback(async () => {
    const ctx = await ensureCtx();
    return Boolean(ctx && ctx.state === 'running');
  }, [ensureCtx]);

  return { playNote, playChord, unlock };
}
