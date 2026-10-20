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

export function questionFromSpec(root, type) {
  return { root, type, name: root + type, pcs: getChordPitchClasses(root, type) };
}

/** Pitch classes in chord-tone order (root → third → fifth → …). */
export function targetPcsInChordOrder(root, type) {
  const rootPc = NOTE_TO_PC[root];
  if (rootPc === undefined) return [0, 4, 7];
  return getIntervals(type).map((interval) => (rootPc + interval) % 12);
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

export function formatChordAnswer(name, quality) {
  const chord = formatChord(name);
  if (!quality) return chord;
  return `${chord} · ${quality}`;
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

/**
 * Close-position voicing with `inversion` in the bass (0 root, 1 first, 2 second).
 * The bass sits at or above `baseMidi` and the top stays inside two octaves,
 * so a common inversion is not pushed into a higher octave.
 * Seventh chords stop at second inversion in v1 (the seventh is not the bass).
 */
export function voicePitchClasses(tonePcs, inversion = 0, baseMidi = 48) {
  const count = tonePcs?.length ?? 0;
  if (!count) return [];
  const inv = ((inversion % count) + count) % count;
  const capped = Math.min(inv, Math.min(2, count - 1));
  const ordered = Array.from({ length: count }, (_, i) => tonePcs[(capped + i) % count]);
  const bassPc = ((ordered[0] % 12) + 12) % 12;
  const bass = baseMidi + ((bassPc - (baseMidi % 12) + 12) % 12);
  const midis = [bass];
  for (let i = 1; i < ordered.length; i += 1) {
    const pc = ((ordered[i] % 12) + 12) % 12;
    let note = midis[i - 1] + 1;
    while (note % 12 !== pc) note += 1;
    midis.push(note);
  }
  return midis;
}

/** Inversion index implied by the lowest note of a voicing (bass-aware). */
export function soundedInversion(tonePcs, voicing) {
  if (!voicing?.length || !tonePcs?.length) return 0;
  const bass = ((voicing[0] % 12) + 12) % 12;
  const idx = tonePcs.indexOf(bass);
  if (idx < 0) return 0;
  return Math.min(idx, 2);
}

/**
 * True when the played notes contain every chord tone and the lowest note is
 * the bass of `inversion`. Pitch-class sets alone cannot see this.
 */
export function playedInversionMatches(pressedMidis, { tonePcs, inversion }) {
  if (!pressedMidis?.length || !tonePcs?.length) return false;
  const pcs = new Set([...pressedMidis].map((midi) => ((midi % 12) + 12) % 12));
  if (pcs.size !== tonePcs.length) return false;
  if (!tonePcs.every((pc) => pcs.has(pc))) return false;
  const bassMidi = Math.min(...pressedMidis);
  return soundedInversion(tonePcs, [bassMidi]) === inversion;
}

export function withInversion(question, inversion = 0, baseMidi = 48) {
  const tonePcs = targetPcsInChordOrder(question.root, question.type);
  const inv = Math.max(0, Math.min(inversion, Math.min(2, tonePcs.length - 1)));
  const voicing = voicePitchClasses(tonePcs, inv, baseMidi);
  return {
    ...question,
    inversion: inv,
    tonePcs,
    voicing,
    bassPc: voicing[0] % 12,
    id: `${question.name}:${inv}`,
  };
}

export function generateInvertedQuestion(difficulty, lastId = null, random = Math.random) {
  let question;
  let attempts = 0;
  do {
    const base = generateQuestion(difficulty, null, random);
    const inversion = Math.floor(random() * 3);
    question = withInversion(base, inversion);
    attempts += 1;
  } while (question.id === lastId && attempts < 50);
  return question;
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
