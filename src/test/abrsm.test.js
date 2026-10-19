import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  ABRSM5_KEYS,
  buildAbrsmChord,
  generateAbrsmQuestion,
  scaleSpelling,
} from '../lib/abrsm.js';
import { formatPitchText } from '../lib/chords.js';

describe('roman numeral chords', () => {
  it('keeps the Roman key label from turning Db into DB', () => {
    expect(formatPitchText('DB 大調')).toBe('Db 大調');
    const source = fs.readFileSync(path.resolve('src/components/AbrsmMode.jsx'), 'utf8');
    expect(source).toContain('className="normal-case">{keyName}');
    expect(source).not.toMatch(/uppercase[^>\n]*\{key(?:Label|Name)\}/);
  });

  it('covers major and minor keys up to six sharps or flats', () => {
    expect(ABRSM5_KEYS.major).toHaveLength(13);
    expect(ABRSM5_KEYS.minor).toHaveLength(13);
  });

  it('spells scales with one letter per degree', () => {
    expect(scaleSpelling('F#', 'major').map((n) => n.name)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(scaleSpelling('Gb', 'major').map((n) => n.name)).toEqual(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F']);
    expect(scaleSpelling('G#', 'minor').map((n) => n.name)).toEqual(['G#', 'A#', 'B', 'C#', 'D#', 'E', 'Fx']);
  });

  it('builds II in D major as Em', () => {
    const chord = buildAbrsmChord({ tonic: 'D', mode: 'major', degree: 2 });
    expect(chord.symbol).toBe('II');
    expect(chord.toneNames).toEqual(['E', 'G', 'B']);
    expect(chord.chordName).toBe('Em');
  });

  it('uses the harmonic minor: V is major and II is diminished', () => {
    const v = buildAbrsmChord({ tonic: 'A', mode: 'minor', degree: 5 });
    expect(v.chordName).toBe('E');
    expect(v.toneNames).toEqual(['E', 'G#', 'B']);
    expect(buildAbrsmChord({ tonic: 'C', mode: 'minor', degree: 2 }).chordName).toBe('Ddim');
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
