import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PIANO_TONE } from '../lib/pianoEngine.js';
import {
  PIANO_SAMPLES,
  attackStartIndex,
  pianoSampleUrl,
  playbackRateFor,
  sampleForMidi,
} from '../lib/pianoSamples.js';

describe('piano samples', () => {
  it('warms the close-miked grand instead of leaving it bright', () => {
    const filters = Object.fromEntries(PIANO_TONE.filters.map((filter) => [filter.id, filter]));
    expect(filters.body.gain).toBeGreaterThanOrEqual(4);
    expect(filters.lowMid.frequency).toBeGreaterThan(250);
    expect(filters.lowMid.frequency).toBeLessThan(600);
    expect(filters.lowMid.gain).toBeGreaterThan(1);
    expect(filters.presence.frequency).toBeGreaterThanOrEqual(3000);
    expect(filters.presence.frequency).toBeLessThanOrEqual(5000);
    expect(filters.presence.gain).toBeLessThanOrEqual(-4);
    expect(filters.upper.gain).toBeLessThan(0);
    expect(filters.air.type).toBe('highshelf');
    expect(filters.air.frequency).toBeLessThan(7000);
    expect(filters.air.gain).toBeLessThanOrEqual(-6);
  });

  it('covers every key on the on-screen keyboard within two semitones', () => {
    for (let midi = 36; midi <= 84; midi += 1) {
      const sample = sampleForMidi(midi);
      expect(midi, `midi ${midi}`).toBeGreaterThanOrEqual(sample.lokey);
      expect(midi, `midi ${midi}`).toBeLessThanOrEqual(sample.hikey);
      expect(Math.abs(midi - sample.midi), `midi ${midi}`).toBeLessThanOrEqual(2);
    }
  });

  it('pitch-shifts by equal temperament', () => {
    expect(playbackRateFor(60, 60)).toBe(1);
    expect(playbackRateFor(61, 60)).toBeCloseTo(2 ** (1 / 12), 6);
    expect(playbackRateFor(58, 60)).toBeCloseTo(2 ** (-2 / 12), 6);
  });

  it('builds asset urls from the vite base', () => {
    expect(pianoSampleUrl('C4.m4a', './')).toBe('./audio/piano/C4.m4a');
    expect(pianoSampleUrl('C4.m4a', '/')).toBe('/audio/piano/C4.m4a');
    expect(pianoSampleUrl('Fs4.m4a', '/app/')).toBe('/app/audio/piano/Fs4.m4a');
  });

  it('leaves a real hammer attack in place and strips encoder silence', () => {
    const rate = 48000;
    const early = new Float32Array(rate);
    early[Math.floor(rate * 0.0055)] = 0.2;
    expect(attackStartIndex([early], rate)).toBe(0);

    const delayed = new Float32Array(rate);
    const onset = Math.floor(rate * 0.044);
    delayed[onset] = 0.2;
    const start = attackStartIndex([delayed], rate);
    expect(start).toBeGreaterThan(Math.floor(rate * 0.03));
    expect(start).toBeLessThan(onset);
  });

  it('ships a decoded sample for every mapped note', () => {
    for (const sample of PIANO_SAMPLES) {
      const file = path.resolve('public/audio/piano', sample.file);
      expect(fs.existsSync(file), sample.file).toBe(true);
      expect(fs.statSync(file).size, sample.file).toBeGreaterThan(8000);
      expect(sample.file).not.toMatch(/#/);
    }
    expect(fs.existsSync(path.resolve('public/audio/piano/LICENSE.txt'))).toBe(true);
  });
});

describe('piano sustain for chord drills', () => {
  it('keeps single notes and chords ringing long enough to hear the body', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../hooks/usePiano.js', import.meta.url), 'utf8'),
    );
    const note = Number(src.match(/NOTE_SUSTAIN = ([0-9.]+)/)[1]);
    const chord = Number(src.match(/CHORD_SUSTAIN = ([0-9.]+)/)[1]);
    expect(note).toBeGreaterThanOrEqual(2.8);
    expect(chord).toBeGreaterThanOrEqual(3.2);
    expect(chord).toBeGreaterThan(note);
  });
});
