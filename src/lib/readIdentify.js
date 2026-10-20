/**
 * Read & Identify — name a chord's quality from a treble staff.
 *
 * The staff is drawn with a small SVG (see StaffChord), not VexFlow, so the
 * bundle stays light enough for an iOS WKWebView.
 *
 * Easy: four triad qualities, root position, no ledger lines, few printed
 * accidentals. Medium adds the five seventh qualities, still root position.
 * Hard mixes both, including inversions, and uses more printed accidentals
 * and ledger lines.
 *
 * The answer is the quality, not the root or the inversion.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const SHARP_LETTERS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_LETTERS = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
/** Treble-clef signature slots, as diatonic steps from C4. */
const SHARP_POSITIONS = [10, 7, 11, 8, 5, 9];
const FLAT_POSITIONS = [6, 9, 5, 8, 4, 7];

const INTERVALS = Object.freeze({
  '': [0, 4, 7],
  m: [0, 3, 7],
  aug: [0, 4, 8],
  dim: [0, 3, 6],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
});

export const READ_TIERS = Object.freeze(['easy', 'medium', 'hard']);

export const READ_QUALITIES = Object.freeze([
  { id: '', group: 'triad', testId: 'major', labelKey: 'read.q.major' },
  { id: 'm', group: 'triad', testId: 'minor', labelKey: 'read.q.minor' },
  { id: 'aug', group: 'triad', testId: 'aug', labelKey: 'read.q.aug' },
  { id: 'dim', group: 'triad', testId: 'dim', labelKey: 'read.q.dim' },
  { id: '7', group: 'seventh', testId: 'dom7', labelKey: 'read.q.dom7' },
  { id: 'maj7', group: 'seventh', testId: 'maj7', labelKey: 'read.q.maj7' },
  { id: 'm7', group: 'seventh', testId: 'm7', labelKey: 'read.q.m7' },
  { id: 'm7b5', group: 'seventh', testId: 'halfDim7', labelKey: 'read.q.halfDim7' },
  { id: 'dim7', group: 'seventh', testId: 'dim7', labelKey: 'read.q.dim7' },
]);

const TRIAD_IDS = READ_QUALITIES.filter((q) => q.group === 'triad').map((q) => q.id);
const ALL_IDS = READ_QUALITIES.map((q) => q.id);

const KEYS = Object.freeze([
  { id: 'C', fifths: 0, letterIdx: 0, accidental: 0 },
  { id: 'G', fifths: 1, letterIdx: 4, accidental: 0 },
  { id: 'D', fifths: 2, letterIdx: 1, accidental: 0 },
  { id: 'A', fifths: 3, letterIdx: 5, accidental: 0 },
  { id: 'E', fifths: 4, letterIdx: 2, accidental: 0 },
  { id: 'B', fifths: 5, letterIdx: 6, accidental: 0 },
  { id: 'F', fifths: -1, letterIdx: 3, accidental: 0 },
  { id: 'Bb', fifths: -2, letterIdx: 6, accidental: -1 },
  { id: 'Eb', fifths: -3, letterIdx: 2, accidental: -1 },
  { id: 'Ab', fifths: -4, letterIdx: 5, accidental: -1 },
  { id: 'Db', fifths: -5, letterIdx: 1, accidental: -1 },
]);

const KEYS_BY_TIER = Object.freeze({
  easy: ['C', 'G', 'D', 'F', 'Bb'],
  medium: ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'],
  hard: ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
});

/** Staff positions that need no ledger line: D4 through the space above the staff. */
const RANGE = Object.freeze({
  easy: { min: 1, max: 11 },
  medium: { min: 0, max: 13 },
  hard: { min: -4, max: 16 },
});

const KEY_BY_ID = new Map(KEYS.map((key) => [key.id, key]));

export function normalizeReadTier(tier) {
  return tier === 'medium' || tier === 'hard' ? tier : 'easy';
}

export function qualitiesForTier(tier) {
  const normalized = normalizeReadTier(tier);
  if (normalized === 'easy') return READ_QUALITIES.filter((q) => q.group === 'triad');
  return READ_QUALITIES;
}

export function isReadAnswerCorrect(question, quality) {
  return Boolean(question) && question.quality === quality;
}

export function formatNoteName(name) {
  return String(name || '').replace(/#/g, '\u266F').replace(/b/g, '\u266D');
}

function mod7(n) {
  return ((n % 7) + 7) % 7;
}

function accidentalOffset(pc, letterIdx) {
  return ((pc - NATURAL[letterIdx] + 18) % 12) - 6;
}

function accidentalSuffix(offset) {
  if (offset === 2) return 'x';
  if (offset === 1) return '#';
  if (offset === -1) return 'b';
  if (offset === -2) return 'bb';
  return '';
}

function noteName(letterIdx, offset) {
  return LETTERS[letterIdx] + accidentalSuffix(offset);
}

export function signatureFor(fifths) {
  const count = Math.min(6, Math.abs(fifths));
  const kind = fifths > 0 ? 'sharp' : fifths < 0 ? 'flat' : 'none';
  const letters = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order = fifths > 0 ? SHARP_LETTERS : FLAT_LETTERS;
  const value = fifths > 0 ? 1 : -1;
  for (let i = 0; i < count; i += 1) letters[order[i]] = value;
  const positions = (fifths > 0 ? SHARP_POSITIONS : FLAT_POSITIONS).slice(0, count);
  return { fifths, count, kind, letters, positions };
}

function keyById(id) {
  return KEY_BY_ID.get(id) || KEY_BY_ID.get('C');
}

function tonicOf(key) {
  const spec = keyById(key.id || key);
  const pc = (NATURAL[spec.letterIdx] + spec.accidental + 12) % 12;
  return {
    letterIdx: spec.letterIdx,
    pc,
    accidental: spec.accidental,
    name: noteName(spec.letterIdx, spec.accidental),
  };
}

function scaleDegree(key, degree) {
  const tonic = tonicOf(key);
  const step = MAJOR_STEPS[degree - 1];
  const letterIdx = (tonic.letterIdx + degree - 1) % 7;
  const pc = (tonic.pc + step) % 12;
  const accidental = accidentalOffset(pc, letterIdx);
  return { letterIdx, pc, accidental, name: noteName(letterIdx, accidental) };
}

export function parseNoteName(name) {
  const letterIdx = LETTERS.indexOf(name?.[0]);
  if (letterIdx < 0) return null;
  let accidental = 0;
  for (const ch of String(name).slice(1)) {
    if (ch === '#') accidental += 1;
    else if (ch === 'b') accidental -= 1;
    else if (ch === 'x') accidental += 2;
  }
  const pc = (NATURAL[letterIdx] + accidental + 120) % 12;
  return { letterIdx, pc, accidental, name: noteName(letterIdx, accidental) };
}

function spellPc(pc, preferFlats) {
  let best = null;
  for (let letterIdx = 0; letterIdx < 7; letterIdx += 1) {
    const accidental = accidentalOffset(pc, letterIdx);
    if (Math.abs(accidental) > 1) continue;
    const penalty = Math.abs(accidental) + (
      preferFlats ? (accidental > 0 ? 3 : 0) : (accidental < 0 ? 3 : 0)
    );
    if (!best || penalty < best.penalty) {
      best = { letterIdx, pc, accidental, penalty, name: noteName(letterIdx, accidental) };
    }
  }
  return best;
}

function spellChord(root, quality) {
  const intervals = INTERVALS[quality];
  if (!intervals || !root) return null;
  const steps = intervals.length === 4 ? [0, 2, 4, 6] : [0, 2, 4];
  const tones = intervals.map((semi, index) => {
    const letterIdx = (root.letterIdx + steps[index]) % 7;
    const pc = (root.pc + semi) % 12;
    const accidental = accidentalOffset(pc, letterIdx);
    return {
      letterIdx,
      letter: LETTERS[letterIdx],
      pc,
      accidental,
      name: noteName(letterIdx, accidental),
    };
  });
  if (tones.some((tone) => Math.abs(tone.accidental) > 1)) return null;
  return tones;
}

function glyphFor(noteAccidental, signatureAccidental) {
  if (noteAccidental === signatureAccidental) return null;
  if (noteAccidental === 1) return '#';
  if (noteAccidental === -1) return 'b';
  if (noteAccidental === 0) return 'n';
  return null;
}

function diatonicDelta(fromLetter, toLetter) {
  const delta = (toLetter - fromLetter + 7) % 7;
  return delta === 0 ? 7 : delta;
}

function chordSpan(tones, inversion) {
  const count = tones.length;
  const inv = ((inversion % count) + count) % count;
  let span = 0;
  for (let i = 1; i < count; i += 1) {
    const prev = tones[(inv + i - 1) % count].letterIdx;
    const next = tones[(inv + i) % count].letterIdx;
    span += diatonicDelta(prev, next);
  }
  return span;
}

function bassCandidates(letterIdx, span, minPos, maxPos) {
  const out = [];
  const bassMax = maxPos - span;
  for (let pos = minPos; pos <= bassMax; pos += 1) {
    if (mod7(pos) === letterIdx) out.push(pos);
  }
  return out;
}

function placeChord(tones, inversion, bassPosition, signature) {
  const count = tones.length;
  const inv = ((inversion % count) + count) % count;
  const ordered = Array.from({ length: count }, (_, i) => tones[(inv + i) % count]);
  if (mod7(bassPosition) !== ordered[0].letterIdx) return null;

  let position = bassPosition;
  const notes = ordered.map((tone, index) => {
    if (index > 0) position += diatonicDelta(ordered[index - 1].letterIdx, tone.letterIdx);
    const octave = 4 + Math.round((position - tone.letterIdx) / 7);
    const midi = (octave + 1) * 12 + tone.pc;
    return {
      ...tone,
      position,
      octave,
      midi,
      glyph: glyphFor(tone.accidental, signature.letters[tone.letter] || 0),
      column: 0,
    };
  });

  for (let i = 1; i < notes.length; i += 1) {
    if (notes[i].position === notes[i - 1].position + 1) {
      notes[i].column = notes[i - 1].column === 0 ? 1 : 0;
    }
  }

  const low = notes[0].position;
  const high = notes[notes.length - 1].position;
  const ledgers = [];
  for (let p = 0; p >= low; p -= 2) ledgers.push(p);
  for (let p = 12; p <= high; p += 2) ledgers.push(p);
  const stemDown = (high - 6) >= (6 - low);

  return { notes, ledgers, stemDown, low, high };
}

function printedCount(notes) {
  return notes.filter((note) => note.glyph).length;
}

/**
 * Build one engraved question.
 * `degree` is 1–7 in `key`. `rootName` overrides the degree.
 * `bassPosition` pins the bass staff step (C4 = 0); otherwise the caller
 * passes a position that already fits the tier.
 */
export function buildReadQuestion({
  key = 'C',
  degree = 1,
  rootName = null,
  quality = '',
  inversion = 0,
  bassPosition = 1,
  tier = 'easy',
} = {}) {
  const keySpec = keyById(key);
  const signature = signatureFor(keySpec.fifths);
  const root = rootName ? parseNoteName(rootName) : scaleDegree(keySpec, degree);
  const tones = spellChord(root, quality);
  if (!root || !tones) return null;
  const count = tones.length;
  const inv = Math.max(0, Math.min(inversion, count - 1));
  const placed = placeChord(tones, inv, bassPosition, signature);
  if (!placed) return null;
  if (placed.notes.some((note, index) => index > 0 && note.midi <= placed.notes[index - 1].midi)) {
    return null;
  }

  const rootNameSpelled = root.name;
  return {
    id: `${keySpec.id}|${quality}|${inv}|${placed.notes.map((note) => `${note.name}${note.octave}`).join('.')}`,
    tier: normalizeReadTier(tier),
    keyId: keySpec.id,
    quality,
    type: quality,
    root: rootNameSpelled,
    name: `${rootNameSpelled}${quality}`,
    inversion: inv,
    notes: placed.notes,
    voicing: placed.notes.map((note) => note.midi),
    ledgers: placed.ledgers,
    ledgerCount: placed.ledgers.length,
    stemDown: placed.stemDown,
    signature,
    printedAccidentals: printedCount(placed.notes),
    labelKey: READ_QUALITIES.find((item) => item.id === quality)?.labelKey || 'read.q.major',
  };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function chooseBass(tones, inversion, tier, random) {
  const span = chordSpan(tones, inversion);
  const letterIdx = tones[((inversion % tones.length) + tones.length) % tones.length].letterIdx;
  const { min, max } = RANGE[tier];
  const candidates = bassCandidates(letterIdx, span, min, max);
  if (!candidates.length) return null;
  const needsLedger = (pos) => pos < 1 || pos + span > 11;
  if (tier === 'hard' && random() < 0.7) {
    const ledgy = candidates.filter(needsLedger);
    if (ledgy.length) return pick(ledgy, random);
  }
  if (tier === 'medium' && random() < 0.35) {
    const ledgy = candidates.filter(needsLedger);
    if (ledgy.length) return pick(ledgy, random);
  }
  if (tier === 'easy') {
    const clean = candidates.filter((pos) => !needsLedger(pos));
    if (clean.length) return pick(clean, random);
  }
  return pick(candidates, random);
}

function randomRoot(key, tier, random) {
  const chromatic = tier === 'hard' && random() < 0.55;
  if (!chromatic) {
    return scaleDegree(key, 1 + Math.floor(random() * 7));
  }
  const pc = Math.floor(random() * 12);
  return spellPc(pc, key.fifths < 0);
}

function withinBudget(question, tier) {
  if (!question) return false;
  if (question.notes.some((note) => Math.abs(note.accidental) > 1)) return false;
  if (tier === 'easy') {
    return question.inversion === 0
      && TRIAD_IDS.includes(question.quality)
      && question.ledgerCount === 0
      && question.printedAccidentals <= 1;
  }
  if (tier === 'medium') {
    return question.inversion === 0
      && question.ledgerCount <= 1
      && question.printedAccidentals <= 2;
  }
  return question.ledgerCount <= 4 && question.printedAccidentals <= 4;
}

export function generateReadQuestion({
  tier = 'easy',
  lastId = null,
  random = Math.random,
} = {}) {
  const normalized = normalizeReadTier(tier);
  const qualities = normalized === 'easy' ? TRIAD_IDS : ALL_IDS;
  const keyIds = KEYS_BY_TIER[normalized];
  let fallback = null;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const key = keyById(pick(keyIds, random));
    const quality = pick(qualities, random);
    const root = randomRoot(key, normalized, random);
    const toneCount = INTERVALS[quality].length;
    const inversion = normalized === 'hard' ? Math.floor(random() * toneCount) : 0;
    const tones = spellChord(root, quality);
    if (!tones) continue;
    const bassPosition = chooseBass(tones, inversion, normalized, random);
    if (bassPosition == null) continue;
    const question = buildReadQuestion({
      key: key.id,
      rootName: root.name,
      quality,
      inversion,
      bassPosition,
      tier: normalized,
    });
    if (!question || question.id === lastId) continue;
    if (!fallback) fallback = question;
    if (withinBudget(question, normalized)) return question;
  }

  return fallback || buildReadQuestion({
    key: 'C',
    degree: 1,
    quality: '',
    inversion: 0,
    bassPosition: 7,
    tier: normalized,
  });
}

/** Rebuild a missed chord (root, quality, inversion, key) for the mistake book. */
export function questionFromReadSpec(spec) {
  if (!spec?.root || typeof spec.type !== 'string') return null;
  const root = parseNoteName(spec.root);
  if (!root) return null;
  const quality = spec.type;
  if (!INTERVALS[quality]) return null;
  const inversion = Number.isInteger(spec.inversion) ? spec.inversion : 0;
  const keyId = KEY_BY_ID.has(spec.keyId) ? spec.keyId : defaultKeyId(root);
  const key = keyById(keyId);
  const tones = spellChord(root, quality);
  if (!tones) return null;
  const count = tones.length;
  const inv = Math.max(0, Math.min(inversion, count - 1));
  const span = chordSpan(tones, inv);
  const letterIdx = tones[inv].letterIdx;
  const candidates = bassCandidates(letterIdx, span, RANGE.hard.min, RANGE.hard.max);
  const preferred = candidates.find((pos) => pos >= 1 && pos + span <= 11) ?? candidates[0];
  if (preferred == null) return null;
  return buildReadQuestion({
    key: key.id,
    rootName: root.name,
    quality,
    inversion: inv,
    bassPosition: preferred,
    tier: 'hard',
  });
}

function defaultKeyId(root) {
  const match = KEYS.find((key) => (
    Math.abs(key.fifths) <= 2
    && signatureFor(key.fifths).letters[LETTERS[root.letterIdx]] === root.accidental
  ));
  return match?.id || 'C';
}
