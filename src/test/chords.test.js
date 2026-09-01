import { describe, it, expect } from 'vitest';
import {
  getChordPitchClasses,
  generateQuestion,
  buildChordVoicing,
  formatChord,
  isCorrectNote,
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

  it('checks note correctness by pitch class', () => {
    const pcs = getChordPitchClasses('C', '');
    expect(isCorrectNote(60, pcs)).toBe(true);
    expect(isCorrectNote(61, pcs)).toBe(false);
  });
});
