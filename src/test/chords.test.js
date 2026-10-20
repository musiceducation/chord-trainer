import { describe, it, expect } from 'vitest';
import {
  getChordPitchClasses,
  generateQuestion,
  buildChordVoicing,
  formatChord,
  isCorrectNote,
  playedInversionMatches,
  romanPlayIsCorrect,
  questionFromSpec,
  soundedInversion,
  targetPcsInChordOrder,
  voicePitchClasses,
  withInversion,
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

  it('voices inversions from the bass and scores that bass', () => {
    const root = voicePitchClasses([0, 4, 7], 0, 48);
    expect(root).toEqual([48, 52, 55]);
    const first = voicePitchClasses([0, 4, 7], 1, 48);
    expect(first[0] % 12).toBe(4);
    expect(first).toEqual([52, 55, 60]);
    expect(first[first.length - 1]).toBeLessThan(48 + 24);
    const second = voicePitchClasses([0, 4, 7], 2, 48);
    expect(second[0] % 12).toBe(7);
    expect(soundedInversion([0, 4, 7], second)).toBe(2);

    const played = withInversion(questionFromSpec('C', ''), 1);
    expect(playedInversionMatches(played.voicing, played)).toBe(true);
    expect(playedInversionMatches([48, 52, 55], played)).toBe(false);
    const seventh = voicePitchClasses([7, 11, 2, 5], 2, 48);
    expect(seventh[0] % 12).toBe(2);
    expect(soundedInversion([7, 11, 2, 5], seventh)).toBe(2);
  });

  it('scores Roman play-out by pitch class, and by bass when asked', () => {
    const pcs = new Set([0, 4, 7]);
    expect(romanPlayIsCorrect([48, 52, 55], { pcs, bassPc: 0 })).toBe(true);
    expect(romanPlayIsCorrect([48, 52, 55], { pcs, bassPc: 4, requireBass: true })).toBe(false);
    expect(romanPlayIsCorrect([52, 55, 60], { pcs, bassPc: 4, requireBass: true })).toBe(true);
    expect(romanPlayIsCorrect([52, 55], { pcs, bassPc: 4, requireBass: true })).toBe(false);
    expect(romanPlayIsCorrect([48, 52, 55, 58], { pcs, bassPc: 0 })).toBe(false);
    expect(romanPlayIsCorrect([60, 64, 67], { pcs, bassPc: 0, requireBass: true })).toBe(true);
  });

  it('builds a fixed question and chord-tone order', () => {
    const q = questionFromSpec('A', 'm');
    expect(q.name).toBe('Am');
    expect([...q.pcs].sort()).toEqual([0, 4, 9]);
    expect(targetPcsInChordOrder('C', '')).toEqual([0, 4, 7]);
  });
});
