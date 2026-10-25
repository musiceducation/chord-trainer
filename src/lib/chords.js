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

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const LETTER_STEPS = {
  '': [0, 2, 4],
  m: [0, 2, 4],
  dim: [0, 2, 4],
  aug: [0, 2, 4],
  sus2: [0, 1, 4],
  sus4: [0, 3, 4],
  maj7: [0, 2, 4, 6],
  m7: [0, 2, 4, 6],
  '7': [0, 2, 4, 6],
  m7b5: [0, 2, 4, 6],
  dim7: [0, 2, 4, 6],
  '7b9': [0, 2, 4, 6, 8],
  '9': [0, 2, 4, 6, 8],
  maj9: [0, 2, 4, 6, 8],
};

function parseRootName(name) {
  const letterIdx = LETTERS.indexOf(name?.[0]);
  if (letterIdx < 0) return { letterIdx: 0, pc: 0 };
  let offset = 0;
  for (const ch of name.slice(1)) {
    if (ch === '#') offset += 1;
    else if (ch === 'b') offset -= 1;
  }
  return { letterIdx, pc: (NATURAL_PC[letterIdx] + offset + 12) % 12 };
}

function spellLetter(letterIdx, pc) {
  const offset = ((pc - NATURAL_PC[letterIdx] + 18) % 12) - 6;
  if (offset > 0) return LETTERS[letterIdx] + '#'.repeat(offset);
  if (offset < 0) return LETTERS[letterIdx] + 'b'.repeat(-offset);
  return LETTERS[letterIdx];
}

/** Spelled chord tones in stack order, so a slash bass can keep the key's spelling. */
export function chordToneNames(root, type) {
  const { letterIdx, pc } = parseRootName(root);
  const intervals = getIntervals(type);
  const steps = LETTER_STEPS[type] || intervals.map((_, index) => index * 2);
  return intervals.map((semitones, index) => {
    const tonePc = (pc + semitones) % 12;
    const idx = (letterIdx + (steps[index] % 7)) % 7;
    return spellLetter(idx, tonePc);
  });
}

export function formatSlashChord(question) {
  const chord = formatChord(question?.name || '');
  if (!question?.inversion || !question.bassName) return chord;
  return `${chord}/${question.bassName}`;
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
    '6': 'chordType.sixth',
    m6: 'chordType.m6',
    add9: 'chordType.add9',
    madd9: 'chordType.madd9',
    b5: 'chordType.flat5',
    '#5': 'chordType.sharp5',
    '7b5': 'chordType.dom7flat5',
    '7#5': 'chordType.dom7sharp5',
    '7sus4': 'chordType.dom7sus4',
    m9: 'chordType.m9',
    add4: 'chordType.add4',
    '11': 'chordType.dom11',
    '13': 'chordType.dom13',
    maj11: 'chordType.maj11',
    maj13: 'chordType.maj13',
    m11: 'chordType.m11',
    m13: 'chordType.m13',
    '7#9': 'chordType.dom7sharp9',
    '7b13': 'chordType.dom7flat13',
    '7#11': 'chordType.dom7sharp11',
    'maj7#11': 'chordType.maj7sharp11',
    '7alt': 'chordType.alt',
    'm(maj7)': 'chordType.minMaj7',
    '69': 'chordType.sixNine',
  };
  return map[chordType] || 'chordType.major';
}

/**
 * Close-position voicing with `inversion` in the bass
 * (0 root, 1 first, 2 second, 3 third). The bass sits at or above `baseMidi`
 * and the top stays inside two octaves.
 */
export function voicePitchClasses(tonePcs, inversion = 0, baseMidi = 48) {
  const count = tonePcs?.length ?? 0;
  if (!count) return [];
  const inv = Math.max(0, Math.min(inversion, count - 1));
  const ordered = Array.from({ length: count }, (_, i) => tonePcs[(inv + i) % count]);
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

/**
 * Close voicing whose lowest MIDI is `bassPc`.
 * When the bass is already a chord tone, that inversion is used
 * (`voicePitchClasses`) and the bass is not doubled.
 * When it is not a chord tone, the bass stays underneath and the chord tones
 * stack above it in formula order — root position, shifted until every tone
 * is strictly above the bass. Common for C/D or Am/G.
 */
export function voiceWithBass(tonePcs, bassPc, baseMidi = 48) {
  const pcs = (tonePcs || []).map((pc) => ((pc % 12) + 12) % 12);
  if (!pcs.length || !Number.isFinite(bassPc)) return [];
  const bassNorm = ((bassPc % 12) + 12) % 12;
  const inversion = pcs.indexOf(bassNorm);
  if (inversion >= 0) return voicePitchClasses(pcs, inversion, baseMidi);
  const lowest = baseMidi + ((bassNorm - (baseMidi % 12) + 12) % 12);
  const midis = [lowest];
  for (const pc of pcs) {
    let note = midis[midis.length - 1] + 1;
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
  return idx;
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

/**
 * Roman play-out: every chord pitch class is present.
 * When `requireBass` is set, the lowest played note must be `bassPc`.
 */
export function romanPlayIsCorrect(pressedMidis, { pcs, bassPc, requireBass = false } = {}) {
  if (!pressedMidis?.length || !pcs) return false;
  const target = pcs instanceof Set ? pcs : new Set(pcs);
  if (!target.size) return false;
  const played = new Set([...pressedMidis].map((midi) => ((midi % 12) + 12) % 12));
  if (played.size !== target.size) return false;
  for (const pc of target) {
    if (!played.has(((pc % 12) + 12) % 12)) return false;
  }
  if (!requireBass) return true;
  const bassMidi = Math.min(...pressedMidis);
  return ((bassMidi % 12) + 12) % 12 === ((bassPc % 12) + 12) % 12;
}

export function withInversion(question, inversion = 0, baseMidi = 48) {
  const toneNames = chordToneNames(question.root, question.type);
  const tonePcs = targetPcsInChordOrder(question.root, question.type);
  const inv = Math.max(0, Math.min(inversion, Math.max(0, tonePcs.length - 1)));
  const voicing = voicePitchClasses(tonePcs, inv, baseMidi);
  return {
    ...question,
    inversion: inv,
    toneNames,
    tonePcs,
    voicing,
    bassPc: voicing[0] % 12,
    bassName: toneNames[inv] || toneNames[0],
    id: `${question.name}:${inv}`,
  };
}

/** Inverted Identify questions are never root position, so the prompt always has a slash bass. */
export function generateInvertedQuestion(difficulty, lastId = null, random = Math.random) {
  let question;
  let attempts = 0;
  do {
    const base = generateQuestion(difficulty, null, random);
    const toneCount = targetPcsInChordOrder(base.root, base.type).length;
    const maxInv = Math.min(3, Math.max(1, toneCount - 1));
    const inversion = 1 + Math.floor(random() * maxInv);
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
