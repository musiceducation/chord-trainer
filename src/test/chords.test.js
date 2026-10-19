import { describe, it, expect } from 'vitest';
import {
  getChordPitchClasses,
  generateQuestion,
  buildChordVoicing,
  formatChord,
  formatPitchText,
  isCorrectNote,
  questionFromSpec,
  targetPcsInChordOrder,
} from '../lib/chords.js';

describe('chords', () => {
  it('returns correct pitch classes for C major', () => {
    expect([...getChordPitchClasses('C', '')].sort()).toEqual([0, 4, 7]);
  });

  it('returns correct pitch classes for Am', () => {
    expect([...getChordPitchClasses('A', 'm')].sort()).toEqual([0, 4, 9]);
  });

  it('generates a different question from lastName when possible', () => {
    const q = generateQuestion('basic', 'Cm', () => 0);
    expect(q.name).not.toBe('Cm');
  });

  it('builds voicing from the root, not stacked from the previous note', () => {
    const major = buildChordVoicing('C', '');
    expect(major[1] - major[0]).toBe(4);
    expect(major[2] - major[0]).toBe(7);

    const maj7 = buildChordVoicing('C', 'maj7');
    expect(maj7[1] - maj7[0]).toBe(4);
    expect(maj7[2] - maj7[0]).toBe(7);
    expect(maj7[3] - maj7[0]).toBe(11);
  });

  it('formats chord names', () => {
    expect(formatChord('Cmaj7')).toBe('Cmaj7');
    expect(formatChord('am')).toBe('Am');
  });

  it('keeps a flat as lowercase b and a sharp as #', () => {
    for (const name of ['Db', 'Eb', 'Ab', 'Bb', 'Gb', 'Cb']) {
      expect(formatPitchText(name)).toBe(name);
      expect(formatPitchText(name.toUpperCase())).toBe(name);
      expect(formatPitchText(name.replace('b', '♭'))).toBe(name);
      expect(formatChord(name)).toBe(name);
      expect(formatChord(name.toUpperCase())).toBe(name);
    }
    expect(formatPitchText('Db 大調')).toBe('Db 大調');
    expect(formatPitchText('DB 大調')).toBe('Db 大調');
    expect(formatPitchText('C#')).toBe('C#');
    expect(formatPitchText('c#')).toBe('C#');
    expect(formatPitchText('F♯')).toBe('F#');
    expect(formatChord('Bbm7b5')).toBe('Bbm7b5');
    expect(formatChord('F#m7b5')).toBe('F#m7b5');
    expect(formatChord('Bb: I-V-vi-IV')).toBe('Bb: I-V-vi-IV');
    expect(formatPitchText('Db')).not.toBe('DB');
    expect(formatPitchText('Db 大調')).not.toMatch(/♭|DB/);
  });

  it('checks note correctness by pitch class', () => {
    const pcs = getChordPitchClasses('C', '');
    expect(isCorrectNote(60, pcs)).toBe(true);
    expect(isCorrectNote(61, pcs)).toBe(false);
  });

  it('builds a fixed question and chord-tone order', () => {
    const q = questionFromSpec('A', 'm');
    expect(q.name).toBe('Am');
    expect([...q.pcs].sort()).toEqual([0, 4, 9]);
    expect(targetPcsInChordOrder('C', '')).toEqual([0, 4, 7]);
  });
});
