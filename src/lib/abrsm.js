/**
 * Roman-numeral chords: triads on I, II, IV and V in major and minor keys up
 * to six sharps or flats. Minor keys use the harmonic minor, so V is major.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 11];

export const ABRSM5_KEYS = Object.freeze({
  major: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  minor: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'],
});

export const ABRSM5_DEGREES = Object.freeze([1, 2, 4, 5]);
export const ABRSM5_MODE_FILTERS = Object.freeze(['both', 'major', 'minor']);

const ROMAN = { 1: 'I', 2: 'II', 4: 'IV', 5: 'V' };

function parseNote(name) {
  const letterIdx = LETTERS.indexOf(name?.[0]);
  if (letterIdx < 0) throw new Error(`Unknown note: ${name}`);
  let offset = 0;
  for (const ch of name.slice(1)) {
    if (ch === '#') offset += 1;
    else if (ch === 'b') offset -= 1;
    else if (ch === 'x') offset += 2;
  }
  return { letterIdx, pc: (NATURAL_PC[letterIdx] + offset + 12) % 12 };
}

function spell(letterIdx, pc) {
  const offset = ((pc - NATURAL_PC[letterIdx] + 18) % 12) - 6;
  let accidental = '';
  if (offset === 2) accidental = 'x';
  else if (offset > 0) accidental = '#'.repeat(offset);
  else if (offset < 0) accidental = 'b'.repeat(-offset);
  return LETTERS[letterIdx] + accidental;
}

/** Seven correctly spelled scale notes; minor keys use the harmonic minor. */
export function scaleSpelling(tonic, mode) {
  const { letterIdx, pc } = parseNote(tonic);
  const steps = mode === 'minor' ? HARMONIC_MINOR_STEPS : MAJOR_STEPS;
  return steps.map((step, i) => {
    const notePc = (pc + step) % 12;
    const idx = (letterIdx + i) % 7;
    return { name: spell(idx, notePc), pc: notePc };
  });
}

function triadQuality(rootPc, thirdPc, fifthPc) {
  const third = (thirdPc - rootPc + 12) % 12;
  const fifth = (fifthPc - rootPc + 12) % 12;
  if (third === 4 && fifth === 7) return '';
  if (third === 3 && fifth === 7) return 'm';
  if (third === 3 && fifth === 6) return 'dim';
  return 'aug';
}

export function buildAbrsmChord({ tonic, mode, degree }) {
  const scale = scaleSpelling(tonic, mode);
  const idx = degree - 1;
  const tones = [scale[idx], scale[(idx + 2) % 7], scale[(idx + 4) % 7]];
  const quality = triadQuality(tones[0].pc, tones[1].pc, tones[2].pc);
  return {
    tonic,
    mode,
    degree,
    symbol: ROMAN[degree],
    root: tones[0].name,
    quality,
    toneNames: tones.map((t) => t.name),
    pcs: new Set(tones.map((t) => t.pc)),
    chordName: tones[0].name + quality,
    id: `${tonic}-${mode}-${degree}`,
  };
}

export function generateAbrsmQuestion({ modeFilter = 'both', lastId = null, random = Math.random } = {}) {
  const modes = modeFilter === 'major' || modeFilter === 'minor' ? [modeFilter] : ['major', 'minor'];
  const pick = (list) => list[Math.floor(random() * list.length)];
  let question;
  let attempts = 0;
  do {
    const mode = pick(modes);
    question = buildAbrsmChord({
      tonic: pick(ABRSM5_KEYS[mode]),
      mode,
      degree: pick(ABRSM5_DEGREES),
    });
    attempts += 1;
  } while (question.id === lastId && attempts < 50);
  return question;
}
