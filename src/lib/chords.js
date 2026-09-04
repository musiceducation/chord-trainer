import {
  CHORD_FORMULAS,
  DIFFICULTY_LEVELS,
  NOTE_TO_PC,
  ROOTS,
} from './constants.js';

export function getChordPitchClasses(rootName, chordType) {
  const root = NOTE_TO_PC[rootName];
  if (root === undefined) return new Set([0, 4, 7]);
  const formula = CHORD_FORMULAS[chordType];
  if (!formula) return new Set([0, 4, 7]);
  return new Set(formula.intervals.map((i) => (root + i) % 12));
}

export function getIntervals(chordType) {
  return (CHORD_FORMULAS[chordType] || CHORD_FORMULAS['']).intervals;
}

export function getLabel(chordType) {
  return (CHORD_FORMULAS[chordType] || CHORD_FORMULAS['']).label;
}

export function isCorrectNote(midi, targetPCs) {
  return targetPCs.has(midi % 12);
}

export function generateQuestion(difficulty, lastName, random = Math.random) {
  const types = DIFFICULTY_LEVELS[difficulty].types;
  let q;
  let attempts = 0;
  do {
    const root = ROOTS[Math.floor(random() * ROOTS.length)];
    const type = types[Math.floor(random() * types.length)];
    q = { root, type, name: root + type, pcs: getChordPitchClasses(root, type) };
    attempts += 1;
  } while (q.name === lastName && attempts < 50);
  return q;
}

export function formatChord(name) {
  if (!name) return '';
  // Progression labels like "Bb: I-V-vi-IV" — preserve roman numeral case
  if (name.includes(': ')) return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function chordTypeI18nKey(chordType) {
  const map = {
    '': 'chordType.major',
    m: 'chordType.minor',
    dim: 'chordType.dim',
    aug: 'chordType.aug',
    sus2: 'chordType.sus2',
    sus4: 'chordType.sus4',
    maj7: 'chordType.maj7',
    m7: 'chordType.m7',
    '7': 'chordType.dom7',
    m7b5: 'chordType.m7b5',
    dim7: 'chordType.dim7',
    '7b9': 'chordType.dom7b9',
    '9': 'chordType.dom9',
    maj9: 'chordType.maj9',
  };
  return map[chordType] || 'chordType.major';
}

/** Build a properly spaced chord voicing around MIDI 60 */
export function buildChordVoicing(rootName, chordType, baseMidi = 60) {
  const rootPc = NOTE_TO_PC[rootName];
  if (rootPc === undefined) return [60, 64, 67];
  const intervals = getIntervals(chordType);
  const rootMidi = baseMidi - (baseMidi % 12) + rootPc;
  const midis = [];
  let last = -Infinity;
  intervals.forEach((interval) => {
    let note = rootMidi + interval;
    while (note <= last) note += 12;
    midis.push(note);
    last = note;
  });
  return midis;
}
