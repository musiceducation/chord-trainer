/**
 * Note-name answer pad.
 * Seven natural letters stay fixed. The five black keys are a spelled set
 * (C# D# F# G# A# or Db Eb Gb Ab Bb) chosen from the prompt chord.
 * Inversion entry places each pitch in the lowest octave at or above the
 * bass, so a note that sits below the bass letter in one octave still
 * sounds above it.
 */

import { FULL_END, FULL_START } from './constants.js';
import { chordToneNames } from './chords.js';

export const NATURAL_LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

const NATURAL_PC = Object.freeze({
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
});

const BLACK_PCS = Object.freeze([1, 3, 6, 8, 10]);
const SHARP_BLACK_LABELS = Object.freeze(['C#', 'D#', 'F#', 'G#', 'A#']);
const FLAT_BLACK_LABELS = Object.freeze(['Db', 'Eb', 'Gb', 'Ab', 'Bb']);

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

export function pitchClassForSpelled(label) {
  const letter = String(label || '')[0];
  let accidental = 0;
  for (const ch of String(label || '').slice(1)) {
    if (ch === '#') accidental += 1;
    else if (ch === 'x') accidental += 2;
    else if (ch === 'b') accidental -= 1;
  }
  return pitchClassForLetter(letter, accidental);
}

export function blackKeyButtons(side) {
  const labels = side === 'flat' ? FLAT_BLACK_LABELS : SHARP_BLACK_LABELS;
  return labels.map((label, index) => ({ label, pc: BLACK_PCS[index] }));
}

function accidentalCounts(names) {
  let flats = 0;
  let sharps = 0;
  for (const raw of names) {
    const notes = String(raw ?? '').match(/[A-G](?:x|#|b)*/g) || [];
    for (const note of notes) {
      if (note.includes('b')) flats += 1;
      if (note.includes('#') || note.includes('x')) sharps += 1;
    }
  }
  return { flats, sharps };
}

/**
 * Flat black keys when the prompt chord is flat-spelled (Bb, Eb, b9).
 * Sharp black keys when it is sharp-spelled (C#, F#).
 * A natural chord falls through to its spelled tones, then the key tonic.
 * With no accidental at all, the sharp set is the default.
 */
export function accidentalSide(names = [], symbol = '', tonic = '') {
  const label = String(symbol || '');
  const root = label.match(/^[A-G](x|#|b)?/);
  if (root?.[1] === 'b') return 'flat';
  if (root?.[1] === '#' || root?.[1] === 'x') return 'sharp';
  const rest = root ? label.slice(root[0].length) : label;
  const restFlat = rest.includes('b');
  const restSharp = rest.includes('#') || rest.includes('x');
  if (restFlat && !restSharp) return 'flat';
  if (restSharp && !restFlat) return 'sharp';
  const counted = accidentalCounts([...(names || []), tonic].filter(Boolean));
  if (counted.flats > counted.sharps) return 'flat';
  if (counted.sharps > counted.flats) return 'sharp';
  return 'sharp';
}

export function chordAccidentalSide(question) {
  if (!question) return 'sharp';
  const toneNames = Array.isArray(question.toneNames) && question.toneNames.length
    ? question.toneNames
    : (question.root ? chordToneNames(question.root, question.type || '') : []);
  return accidentalSide(toneNames, question.name || question.chordName || '', question.tonic || '');
}

/** Display octave used everywhere else: MIDI 48 is C3. */
export function displayOctave(keyboardStart) {
  return Math.floor(keyboardStart / 12) - 1;
}

/**
 * MIDI for a letter in the shared octave.
 * # raises and ♭ lowers by one semitone, including across C/B.
 */
export function midiForLetter(letter, accidental, octave) {
  const base = NATURAL_PC[letter];
  if (base === undefined) return (octave + 1) * 12;
  return (octave + 1) * 12 + base + accidental;
}

export function midiInDisplayOctave(pc, octave) {
  return (octave + 1) * 12 + ((pc % 12) + 12) % 12;
}

/** Lowest MIDI of `pc` that is at or above `bassMidi` (the bass itself when they match). */
export function lowestMidiAtOrAbove(pc, bassMidi) {
  const target = ((pc % 12) + 12) % 12;
  let note = bassMidi;
  while (((note % 12) + 12) % 12 !== target) note += 1;
  return note;
}

function layoutAroundBass(pcs, bassMidi) {
  return pcs.map((pc) => lowestMidiAtOrAbove(pc, bassMidi));
}

/**
 * Close voicing for pad pitch classes.
 * Once `bassPc` is among them, it stays in `octave` and every other pitch
 * is the next time that pitch class occurs at or above the bass.
 * Notes entered before the bass stay in `octave` until the bass arrives.
 * The whole voicing shifts by octaves only to remain on the piano.
 */
export function voicePadPitchClasses(pitchClasses, { bassPc = null, octave = 3 } = {}) {
  const pcs = [...(pitchClasses || [])].map((pc) => ((pc % 12) + 12) % 12);
  if (!pcs.length) return [];
  const bass = bassPc == null ? null : ((bassPc % 12) + 12) % 12;
  if (bass == null || !pcs.includes(bass)) {
    return pcs.map((pc) => midiInDisplayOctave(pc, octave));
  }
  let bassMidi = midiInDisplayOctave(bass, octave);
  let midis = layoutAroundBass(pcs, bassMidi);
  while (Math.max(...midis) > FULL_END && bassMidi - 12 >= FULL_START) {
    bassMidi -= 12;
    midis = layoutAroundBass(pcs, bassMidi);
  }
  while (Math.min(...midis) < FULL_START && Math.max(...layoutAroundBass(pcs, bassMidi + 12)) <= FULL_END) {
    bassMidi += 12;
    midis = layoutAroundBass(pcs, bassMidi);
  }
  return midis;
}

export function nextPadMidis(prevMidis, pc, { bassPc = null, octave = 3 } = {}) {
  const target = ((pc % 12) + 12) % 12;
  const pcs = [];
  for (const midi of prevMidis || []) {
    const existing = ((midi % 12) + 12) % 12;
    if (existing !== target && !pcs.includes(existing)) pcs.push(existing);
  }
  pcs.push(target);
  return voicePadPitchClasses(pcs, { bassPc, octave });
}

/**
 * Next pressed MIDI list after one key.
 * `voice` stacks note-name inversion answers above the bass.
 * Keyboard answers keep the MIDI the player actually pressed.
 */
export function pressedAfterNote(prevMidis, midi, { voice = false, bassPc = null, octave = 3 } = {}) {
  const pc = ((Number(midi) % 12) + 12) % 12;
  if (!voice) {
    const midis = [...(prevMidis || [])].filter((played) => ((played % 12) + 12) % 12 !== pc);
    midis.push(midi);
    return { pc, sounding: midi, midis };
  }
  const midis = nextPadMidis(prevMidis, pc, { bassPc, octave });
  const sounding = midis.find((played) => ((played % 12) + 12) % 12 === pc) ?? midi;
  return { pc, sounding, midis };
}

export function canShiftSharedOctave(keyboardStart, direction) {
  const next = keyboardStart + direction * 12;
  return next >= FULL_START && next + 12 <= FULL_END;
}
