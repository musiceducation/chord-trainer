/**
 * Note-name answer pad: seven natural letters plus one-shot # / ♭.
 * Chips never carry an octave. A single shared octave (the keyboard window)
 * sets the sounding MIDI so inversion bass can sit below the other chord tones.
 */

import { FULL_END, FULL_START } from './constants.js';

export const NATURAL_LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

const NATURAL_PC = Object.freeze({
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
});

/**
 * One letter per pitch class, so a locked note lights a single chip.
 * Sharps stay on the lower letter (C#, F#); flats stay on the upper (Eb, Ab, Bb).
 */
const LETTER_FOR_PC = Object.freeze(['C', 'C', 'D', 'E', 'E', 'F', 'F', 'G', 'A', 'A', 'B', 'B']);

export function letterForPitchClass(pc) {
  const n = ((pc % 12) + 12) % 12;
  return LETTER_FOR_PC[n];
}

export function pitchClassForLetter(letter, accidental = 0) {
  const base = NATURAL_PC[letter];
  if (base === undefined) return 0;
  return (base + accidental + 12) % 12;
}

/** Display octave used everywhere else: MIDI 48 is C3. */
export function displayOctave(keyboardStart) {
  return Math.floor(keyboardStart / 12) - 1;
}

/**
 * MIDI for a letter in the shared octave.
 * # raises and ♭ lowers by one semitone, including across C/B, so the
 * sounding pitch — and therefore the inversion bass — matches the modifier.
 */
export function midiForLetter(letter, accidental, octave) {
  const base = NATURAL_PC[letter];
  if (base === undefined) return (octave + 1) * 12;
  return (octave + 1) * 12 + base + accidental;
}

export function canShiftSharedOctave(keyboardStart, direction) {
  const next = keyboardStart + direction * 12;
  return next >= FULL_START && next + 12 <= FULL_END;
}
