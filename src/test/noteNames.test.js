import { describe, expect, it } from 'vitest';
import {
  NATURAL_LETTERS,
  canShiftSharedOctave,
  displayOctave,
  letterForPitchClass,
  midiForLetter,
  pitchClassForLetter,
} from '../lib/noteNames.js';

describe('note name pad', () => {
  it('names the seven naturals and no octave digits', () => {
    expect(NATURAL_LETTERS).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(NATURAL_LETTERS.some((letter) => /\d/.test(letter))).toBe(false);
  });

  it('maps each pitch class onto one natural chip', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(letterForPitchClass)).toEqual([
      'C', 'C', 'D', 'E', 'E', 'F', 'F', 'G', 'A', 'A', 'B', 'B',
    ]);
  });

  it('sounds the shared octave, with # up and ♭ down', () => {
    expect(displayOctave(48)).toBe(3);
    expect(midiForLetter('C', 0, 3)).toBe(48);
    expect(midiForLetter('E', 0, 3)).toBe(52);
    expect(midiForLetter('B', 0, 3)).toBe(59);
    expect(midiForLetter('C', 1, 3)).toBe(49);
    expect(midiForLetter('F', 1, 3) % 12).toBe(pitchClassForLetter('F', 1));
    expect(midiForLetter('E', -1, 3)).toBe(51);
    expect(midiForLetter('B', -1, 3)).toBe(58);
    expect(midiForLetter('C', -1, 3)).toBe(47);
    expect(midiForLetter('B', 1, 3)).toBe(60);
    expect(midiForLetter('C', 0, 4)).toBe(60);
  });

  it('shifts one shared octave inside the piano range', () => {
    expect(canShiftSharedOctave(48, -1)).toBe(true);
    expect(canShiftSharedOctave(36, -1)).toBe(false);
    expect(canShiftSharedOctave(72, 1)).toBe(false);
    expect(canShiftSharedOctave(60, 1)).toBe(true);
  });
});
