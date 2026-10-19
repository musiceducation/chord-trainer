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

/**
 * Display spelling. The letter is uppercase, a flat stays ASCII "b"
 * (Db, not DB or D♭), and a sharp stays "#". Pitch-class ids are unchanged;
 * call this only when rendering.
 */
export function formatPitchText(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/([A-Ga-g])b/gi, (_, letter) => `${letter.toUpperCase()}b`)
    .replace(/([A-Ga-g])#/g, (_, letter) => `${letter.toUpperCase()}#`);
}

export function formatChord(name) {
  if (!name) return '';
  // Progression labels like "Bb: I-V-vi-IV" — preserve roman numeral case
  if (name.includes(': ')) return formatPitchText(name);
  const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return formatPitchText(normalized);
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

const VOICE_LOW = 48;
const VOICE_HIGH = 76;

function uniqueChordPcs(rootName, chordType) {
  const rootPc = NOTE_TO_PC[rootName];
  if (rootPc === undefined) return [0, 4, 7];
  const pcs = [];
  getIntervals(chordType).forEach((interval) => {
    const pc = (rootPc + ((interval % 12) + 12) % 12) % 12;
    if (!pcs.includes(pc)) pcs.push(pc);
  });
  return pcs;
}

function nearestMidi(target, pc, low = VOICE_LOW, high = VOICE_HIGH) {
  let best = null;
  let bestDist = Infinity;
  for (let midi = low; midi <= high; midi += 1) {
    if ((midi % 12) !== pc) continue;
    const dist = Math.abs(midi - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = midi;
    }
  }
  return best;
}

function clampMidi(midi) {
  let note = midi;
  while (note < VOICE_LOW) note += 12;
  while (note > VOICE_HIGH) note -= 12;
  return note;
}

/** Close-position root-position voicing with the root in the bass around C3. */
function initialProgressionVoicing(chord) {
  const rootPc = NOTE_TO_PC[chord.root];
  if (rootPc === undefined) return [48, 52, 55];
  const bass = VOICE_LOW + rootPc;
  const pcs = uniqueChordPcs(chord.root, chord.type);
  const midis = [bass];
  let last = bass;
  pcs.forEach((pc) => {
    if (pc === rootPc && midis.length === 1) return;
    let note = last + 1;
    while (note % 12 !== pc) note += 1;
    if (note > VOICE_HIGH) note -= 12;
    midis.push(note);
    last = note;
  });
  return [...new Set(midis)].sort((a, b) => a - b);
}

/**
 * Move each voice to the nearest unused chord tone, keeping common tones.
 * Extra chord tones (sevenths) are added above the previous soprano.
 */
function leadNextVoicing(previous, chord) {
  const pcs = uniqueChordPcs(chord.root, chord.type);
  const voices = [...previous].sort((a, b) => a - b);
  const assigned = new Array(voices.length).fill(null);
  const usedPc = new Set();

  voices.forEach((midi, index) => {
    const pc = ((midi % 12) + 12) % 12;
    if (pcs.includes(pc) && !usedPc.has(pc)) {
      assigned[index] = midi;
      usedPc.add(pc);
    }
  });

  const freeVoices = voices.map((_, index) => index).filter((index) => assigned[index] == null);
  const freePcs = pcs.filter((pc) => !usedPc.has(pc));
  const pairs = [];
  freeVoices.forEach((index) => {
    freePcs.forEach((pc) => {
      const midi = nearestMidi(voices[index], pc);
      if (midi == null) return;
      pairs.push({ index, pc, midi, dist: Math.abs(midi - voices[index]) });
    });
  });
  pairs.sort((a, b) => a.dist - b.dist || a.index - b.index);
  const takenVoice = new Set();
  const takenPc = new Set();
  pairs.forEach((pair) => {
    if (takenVoice.has(pair.index) || takenPc.has(pair.pc)) return;
    assigned[pair.index] = pair.midi;
    takenVoice.add(pair.index);
    takenPc.add(pair.pc);
    usedPc.add(pair.pc);
  });

  let result = assigned.filter((midi) => midi != null).map(clampMidi);

  pcs.forEach((pc) => {
    if (result.some((midi) => ((midi % 12) + 12) % 12 === pc)) return;
    const anchor = result.length ? Math.max(...result) : 60;
    const midi = nearestMidi(anchor + 2, pc);
    if (midi != null) result.push(midi);
  });

  result = [...new Set(result.map(clampMidi))].sort((a, b) => a - b);
  return result.length ? result : initialProgressionVoicing(chord);
}

/** Voice a whole progression so common tones stay and the other voices step. */
export function voiceLeadProgression(chords) {
  if (!Array.isArray(chords) || chords.length === 0) return [];
  const voiced = [];
  let previous = null;
  chords.forEach((chord) => {
    const next = previous ? leadNextVoicing(previous, chord) : initialProgressionVoicing(chord);
    voiced.push(next);
    previous = next;
  });
  return voiced;
}
