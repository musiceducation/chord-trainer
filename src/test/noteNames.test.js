import { describe, expect, it } from 'vitest';
import { buildAbrsmChord } from '../lib/abrsm.js';
import {
  questionFromSpec,
  romanPlayIsCorrect,
  withInversion,
} from '../lib/chords.js';
import {
  NATURAL_LETTERS,
  accidentalSide,
  blackKeyButtons,
  canShiftSharedOctave,
  chordAccidentalSide,
  displayOctave,
  letterForPitchClass,
  midiForLetter,
  nextPadMidis,
  pitchClassForLetter,
  voicePadPitchClasses,
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

  it('switches the black-key set with the prompt chord spelling', () => {
    expect(blackKeyButtons('flat').map((key) => key.label)).toEqual(['Db', 'Eb', 'Gb', 'Ab', 'Bb']);
    expect(blackKeyButtons('sharp').map((key) => key.label)).toEqual(['C#', 'D#', 'F#', 'G#', 'A#']);
    expect(blackKeyButtons('flat').map((key) => key.pc)).toEqual([1, 3, 6, 8, 10]);
    expect(blackKeyButtons('sharp').map((key) => key.pc)).toEqual(blackKeyButtons('flat').map((key) => key.pc));

    expect(chordAccidentalSide({ name: 'Bb7b9', root: 'Bb', type: '7b9' })).toBe('flat');
    expect(chordAccidentalSide({ name: 'C#', root: 'C#', type: '' })).toBe('sharp');
    expect(chordAccidentalSide({ name: 'C7b9', root: 'C', type: '7b9' })).toBe('flat');
    expect(chordAccidentalSide({ name: 'Cdim', root: 'C', type: 'dim' })).toBe('flat');
    expect(chordAccidentalSide({ name: 'Caug', root: 'C', type: 'aug' })).toBe('sharp');
    expect(chordAccidentalSide({ name: 'C', root: 'C', type: '' })).toBe('sharp');
    expect(chordAccidentalSide({
      chordName: 'F',
      toneNames: ['F', 'A', 'C'],
      tonic: 'Bb',
    })).toBe('flat');
    expect(accidentalSide(['F#', 'A#', 'C#'], 'F#')).toBe('sharp');
  });
});

describe('note-name inversion voicing', () => {
  it('lifts notes that would fall below the inversion bass', () => {
    const question = withInversion(questionFromSpec('C', ''), 1, 48);
    expect(question.bassName).toBe('E');
    const sameOctave = question.tonePcs.map((pc) => 48 + pc);
    expect(romanPlayIsCorrect(sameOctave, {
      pcs: question.pcs,
      bassPc: question.bassPc,
      requireBass: true,
    })).toBe(false);

    let midis = [];
    for (const pc of [0, 7, 4]) {
      midis = nextPadMidis(midis, pc, { bassPc: question.bassPc, octave: 3 });
    }
    const lowest = Math.min(...midis);
    expect(lowest % 12).toBe(4);
    expect(midis.find((midi) => midi % 12 === 0)).toBeGreaterThan(lowest);
    expect(romanPlayIsCorrect(midis, {
      pcs: question.pcs,
      bassPc: question.bassPc,
      requireBass: true,
    })).toBe(true);
  });

  it('accepts VI⁶ from the pad when the bass is not the lowest letter', () => {
    const vi6 = buildAbrsmChord({ tonic: 'G', mode: 'major', degree: 6, inversion: 1 });
    expect(vi6.figure.startsWith('vi')).toBe(true);
    expect(vi6.bassName).toBe('G');
    const sameOctave = vi6.tonePcs.map((pc) => 48 + pc);
    expect(Math.min(...sameOctave) % 12).not.toBe(vi6.bassPc);

    let midis = [];
    for (const pc of [4, 11, 7]) {
      midis = nextPadMidis(midis, pc, { bassPc: vi6.bassPc, octave: 3 });
    }
    expect(Math.min(...midis) % 12).toBe(vi6.bassPc);
    expect(romanPlayIsCorrect(midis, {
      pcs: vi6.pcs,
      bassPc: vi6.bassPc,
      requireBass: true,
    })).toBe(true);
  });

  it('keeps a high voicing inside the piano without dropping the bass', () => {
    const midis = voicePadPitchClasses([11, 1, 6], { bassPc: 11, octave: 5 });
    expect(Math.max(...midis)).toBeLessThanOrEqual(84);
    expect(Math.min(...midis)).toBeGreaterThanOrEqual(36);
    expect(Math.min(...midis) % 12).toBe(11);
  });
});
