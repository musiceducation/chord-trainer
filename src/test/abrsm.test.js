import { describe, it, expect } from 'vitest';
import {
  ABRSM5_KEYS,
  ROMAN_TIERS,
  buildAbrsmChord,
  formatRomanFigure,
  generateAbrsmQuestion,
  poolForTier,
  scaleSpelling,
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

  it('adds V7 on the +V7 tier and keeps it out of basic', () => {
    const major = buildAbrsmChord({ tonic: 'C', mode: 'major', kind: 'V7' });
    expect(major.symbol).toBe('V7');
    expect(major.toneNames).toEqual(['G', 'B', 'D', 'F']);
    expect(major.chordName).toBe('G7');
    const minor = buildAbrsmChord({ tonic: 'A', mode: 'minor', kind: 'V7' });
    expect(minor.toneNames).toEqual(['E', 'G#', 'B', 'D']);
    expect(minor.chordName).toBe('E7');
    expect(poolForTier('basic').map((item) => item.kind)).not.toContain('V7');
    expect(poolForTier('v7').map((item) => item.kind)).toContain('V7');
    expect(poolForTier('v7').map((item) => item.kind)).not.toContain('V/V');
  });

  it('adds V/V as a major triad only on the +V/V tier', () => {
    const major = buildAbrsmChord({ tonic: 'C', mode: 'major', kind: 'V/V' });
    expect(major.symbol).toBe('V/V');
    expect(major.quality).toBe('');
    expect(major.toneNames).toEqual(['D', 'F#', 'A']);
    const minor = buildAbrsmChord({ tonic: 'A', mode: 'minor', kind: 'V/V' });
    expect(minor.toneNames).toEqual(['B', 'D#', 'F#']);
    const flat = buildAbrsmChord({ tonic: 'Eb', mode: 'major', kind: 'V/V' });
    expect(flat.toneNames).toEqual(['F', 'A', 'C']);
    expect(poolForTier('vOfV').some((item) => item.kind === 'V/V')).toBe(true);
    expect(poolForTier('basic').some((item) => item.kind === 'V/V')).toBe(false);
  });

  it('figures triad and seventh inversions in standard notation', () => {
    expect(formatRomanFigure('I', 0)).toBe('I');
    expect(formatRomanFigure('I', 1)).toBe('I\u2076');
    expect(formatRomanFigure('V', 2)).toBe('V\u2076\u2084');
    expect(formatRomanFigure('ii', 1)).toBe('ii\u2076');
    expect(formatRomanFigure('vii\u00B0', 2)).toBe('vii\u00B0\u2076\u2084');
    expect(formatRomanFigure('V/V', 0)).toBe('V/V');
    expect(formatRomanFigure('V/V', 1)).toBe('V\u2076/V');
    expect(formatRomanFigure('V/V', 2)).toBe('V\u2076\u2084/V');
    expect(formatRomanFigure('V7', 0, { seventh: true })).toBe('V7');
    expect(formatRomanFigure('V7', 1, { seventh: true })).toBe('V\u2076\u2085');
    expect(formatRomanFigure('V7', 2, { seventh: true })).toBe('V\u2074\u2083');
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

    const dominant = buildAbrsmChord({ tonic: 'C', mode: 'major', kind: 'V7', inversion: 1 });
    expect(dominant.figure).toBe('V\u2076\u2085');
    expect(dominant.voicing[0] % 12).toBe(11);
    expect(dominant.voicing[dominant.voicing.length - 1]).toBeLessThan(48 + 24);

    const secondary = buildAbrsmChord({ tonic: 'A', mode: 'minor', kind: 'V/V', inversion: 1 });
    expect(secondary.figure).toBe('V\u2076/V');
    expect(soundedInversion(secondary.tonePcs, secondary.voicing)).toBe(1);
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

  it('draws V7 and V/V only from the tiers that include them', () => {
    for (let i = 0; i < 40; i += 1) {
      const basic = generateAbrsmQuestion({ tier: 'basic', random: () => ((i * 17) % 100) / 100 });
      expect(basic.kind).toBe('triad');
      const v7 = generateAbrsmQuestion({ tier: 'v7', random: () => ((i * 13) % 100) / 100 });
      expect(v7.kind === 'triad' || v7.kind === 'V7').toBe(true);
      expect(v7.kind).not.toBe('V/V');
    }
    const forced = generateAbrsmQuestion({
      tier: 'vOfV',
      modeFilter: 'major',
      inversions: true,
      random: () => 0.99,
    });
    expect(ROMAN_TIERS).toContain('vOfV');
    expect(forced.inversion).toBe(2);
    expect(forced.choices).toBeUndefined();
    expect(forced.figure).toBeTruthy();
    expect(soundedInversion(forced.tonePcs, forced.voicing)).toBe(forced.inversion);
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
