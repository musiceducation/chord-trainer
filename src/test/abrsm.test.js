import { describe, it, expect } from 'vitest';
import {
  ABRSM5_KEYS,
  ROMAN_TIERS,
  buildAbrsmChord,
  formatRomanFigure,
  generateAbrsmQuestion,
  normalizeRomanTier,
  poolForTier,
  scaleSpelling,
  splitRomanFigure,
} from '../lib/abrsm.js';
import { soundedInversion } from '../lib/chords.js';

describe('roman numeral chords', () => {
  it('covers major and minor keys up to six sharps or flats', () => {
    expect(ABRSM5_KEYS.major).toHaveLength(13);
    expect(ABRSM5_KEYS.minor).toHaveLength(13);
  });

  it('spells scales with one letter per degree', () => {
    expect(scaleSpelling('F#', 'major').map((n) => n.name)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(scaleSpelling('Gb', 'major').map((n) => n.name)).toEqual(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F']);
    expect(scaleSpelling('G#', 'minor').map((n) => n.name)).toEqual(['G#', 'A#', 'B', 'C#', 'D#', 'E', 'Fx']);
  });

  it('builds ii in D major as Em', () => {
    const chord = buildAbrsmChord({ tonic: 'D', mode: 'major', degree: 2 });
    expect(chord.symbol).toBe('ii');
    expect(chord.toneNames).toEqual(['E', 'G', 'B']);
    expect(chord.chordName).toBe('Em');
  });

  it('spells the basic major pool with case and a diminished seventh degree', () => {
    const symbols = [1, 2, 3, 4, 5, 6, 7].map((degree) => (
      buildAbrsmChord({ tonic: 'C', mode: 'major', degree }).symbol
    ));
    expect(symbols).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii\u00B0']);
    expect(buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 7 }).toneNames).toEqual(['B', 'D', 'F']);
  });

  it('spells harmonic-minor triads without an augmented III', () => {
    const symbols = [1, 2, 3, 4, 5, 6, 7].map((degree) => (
      buildAbrsmChord({ tonic: 'A', mode: 'minor', degree }).symbol
    ));
    expect(symbols).toEqual(['i', 'ii\u00B0', 'III', 'iv', 'V', 'VI', 'vii\u00B0']);
    expect(buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 3 }).toneNames).toEqual(['C', 'E', 'G']);
    expect(buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 3 }).quality).toBe('');
    expect(buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 7 }).toneNames).toEqual(['G#', 'B', 'D']);
    const ebThree = buildAbrsmChord({ tonic: 'Eb', mode: 'minor', degree: 3 });
    expect(ebThree.symbol).toBe('III');
    expect(ebThree.toneNames).toEqual(['Gb', 'Bb', 'Db']);
    expect(ebThree.quality).not.toBe('aug');
  });

  it('uses the harmonic minor: V is major and ii is diminished', () => {
    const v = buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 5 });
    expect(v.symbol).toBe('V');
    expect(v.chordName).toBe('E');
    expect(v.toneNames).toEqual(['E', 'G#', 'B']);
    const two = buildAbrsmChord({ tonic: 'C', mode: 'minor', degree: 2 });
    expect(two.symbol).toBe('ii\u00B0');
    expect(two.chordName).toBe('Ddim');
  });

  it('keeps easy on triads and medium on the seven diatonic sevenths', () => {
    expect(normalizeRomanTier('basic')).toBe('easy');
    expect(normalizeRomanTier('v7')).toBe('medium');
    expect(normalizeRomanTier('vOfV')).toBe('hard');
    expect(poolForTier('easy').every((item) => item.kind === 'triad')).toBe(true);
    expect(poolForTier('basic').every((item) => item.kind === 'triad')).toBe(true);
    expect(poolForTier('medium')).toHaveLength(7);
    expect(poolForTier('medium').every((item) => item.kind === 'seventh')).toBe(true);
    expect(poolForTier('v7').some((item) => item.degree === 5)).toBe(true);
    const symbols = [1, 2, 3, 4, 5, 6, 7].map((degree) => (
      buildAbrsmChord({ tonic: 'C', mode: 'major', degree, kind: 'seventh' }).symbol
    ));
    expect(symbols).toEqual(['IM7', 'ii7', 'iii7', 'IVM7', 'V7', 'vi7', 'vii\u00F87']);
    const dominant = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 5, kind: 'seventh' });
    expect(dominant.toneNames).toEqual(['G', 'B', 'D', 'F']);
    expect(dominant.chordName).toBe('G7');
    const minor = buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 5, kind: 'seventh' });
    expect(minor.toneNames).toEqual(['E', 'G#', 'B', 'D']);
    expect(minor.chordName).toBe('E7');
    const ninth = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 5, kind: 'ninth' });
    expect(ninth.symbol).toBe('V9');
    expect(ninth.toneNames).toEqual(['G', 'B', 'D', 'F', 'A']);
    expect(poolForTier('hard').map((item) => item.kind)).toEqual([
      ...Array(7).fill('triad'),
      ...Array(7).fill('seventh'),
      ...Array(7).fill('ninth'),
    ]);
    expect(poolForTier('hard').some((item) => item.kind === 'V/V')).toBe(false);
  });

  it('figures triad, seventh, and ninth inversions, including third inversion', () => {
    expect(formatRomanFigure('I', 0)).toBe('I');
    expect(formatRomanFigure('I', 1)).toBe('I\u2076');
    expect(formatRomanFigure('V', 2)).toBe('V\u2076\u2084');
    expect(formatRomanFigure('ii', 1)).toBe('ii\u2076');
    expect(formatRomanFigure('vii\u00B0', 2)).toBe('vii\u00B0\u2076\u2084');
    expect(formatRomanFigure('V7', 0, { seventh: true })).toBe('V7');
    expect(formatRomanFigure('V7', 1, { seventh: true })).toBe('V\u2076\u2085');
    expect(formatRomanFigure('V7', 2, { seventh: true })).toBe('V\u2074\u2083');
    expect(formatRomanFigure('V7', 3, { seventh: true })).toBe('V\u2074\u2082');
    expect(formatRomanFigure('V9', 1, { ninth: true })).toBe('V9\u2076\u2085');
    expect(splitRomanFigure('V\u2076\u2085')).toEqual({
      body: 'V',
      stack: ['6', '5'],
      text: 'V\u2076\u2085',
    });
    expect(splitRomanFigure('V9\u2076\u2085').body).toBe('V9');
    expect(splitRomanFigure('vii\u00B0\u2076\u2084').body).toBe('vii\u00B0');
    expect(splitRomanFigure('V\u2074\u2082').stack).toEqual(['4', '2']);
  });

  it('voices inversions with the correct bass and figure', () => {
    const first = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 1, inversion: 1 });
    expect(first.figure).toBe('I\u2076');
    expect(first.voicing[0] % 12).toBe(4);
    expect(first.bassPc).toBe(4);
    expect(soundedInversion(first.tonePcs, first.voicing)).toBe(1);
    expect(first.voicing[1]).toBeGreaterThan(first.voicing[0]);

    const second = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 5, inversion: 2 });
    expect(second.figure).toBe('V\u2076\u2084');
    expect(second.voicing[0] % 12).toBe(2);
    expect(soundedInversion(second.tonePcs, second.voicing)).toBe(2);

    const dominant = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 5, kind: 'seventh', inversion: 1 });
    expect(dominant.figure).toBe('V\u2076\u2085');
    expect(dominant.voicing[0] % 12).toBe(11);
    expect(dominant.voicing[dominant.voicing.length - 1]).toBeLessThan(48 + 24);

    const third = buildAbrsmChord({ tonic: 'C', mode: 'major', degree: 5, kind: 'seventh', inversion: 3 });
    expect(third.figure).toBe('V\u2074\u2082');
    expect(third.bassName).toBe('F');
    expect(third.voicing[0] % 12).toBe(5);
    expect(soundedInversion(third.tonePcs, third.voicing)).toBe(3);
  });

  it('keeps augmented sonorities out of the shipped tiers', () => {
    for (const tier of ROMAN_TIERS) {
      for (const mode of ['major', 'minor']) {
        for (const spec of poolForTier(tier)) {
          const chord = buildAbrsmChord({
            tonic: mode === 'major' ? 'C' : 'A',
            mode,
            kind: spec.kind,
            degree: spec.degree,
          });
          expect(chord.quality).not.toBe('aug');
          expect(chord.symbol.includes('+')).toBe(false);
          expect(chord.figure.includes('+')).toBe(false);
        }
      }
    }
  });

  it('draws each tier from its pool and never asks for root position when inversions are on', () => {
    expect(ROMAN_TIERS).toEqual(['easy', 'medium', 'hard']);
    for (let i = 0; i < 24; i += 1) {
      const easy = generateAbrsmQuestion({ tier: 'easy', random: () => ((i * 17) % 100) / 100 });
      expect(easy.kind).toBe('triad');
      const medium = generateAbrsmQuestion({ tier: 'medium', random: () => ((i * 13) % 100) / 100 });
      expect(medium.kind).toBe('seventh');
      const hard = generateAbrsmQuestion({ tier: 'hard', inversions: true, random: () => ((i * 19) % 97) / 97 });
      expect(['triad', 'seventh', 'ninth']).toContain(hard.kind);
      expect(hard.inversion).toBeGreaterThan(0);
      expect(hard.figureParts.stack.length).toBeGreaterThan(0);
      expect(hard.choices).toBeUndefined();
      expect(soundedInversion(hard.tonePcs, hard.voicing)).toBe(hard.inversion);
    }
    const triad = generateAbrsmQuestion({ tier: 'easy', inversions: true, random: () => 0.99 });
    expect(triad.kind).toBe('triad');
    expect(triad.inversion).toBe(2);
    expect(triad.figure).toContain('\u2076\u2084');
  });

  it('respects the major/minor filter and avoids repeating the last question', () => {
    const minorOnly = generateAbrsmQuestion({ modeFilter: 'minor', random: () => 0.5 });
    expect(minorOnly.mode).toBe('minor');
    const first = generateAbrsmQuestion({ random: () => 0 });
    let n = 0;
    const next = generateAbrsmQuestion({ lastId: first.id, random: () => [0, 0, 0, 0.9][n++ % 4] });
    expect(next.id).not.toBe(first.id);
  });
});
