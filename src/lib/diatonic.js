import { NOTE_TO_PC, PC_TO_NOTE } from './constants.js';
import { voiceLeadProgression } from './chords.js';

/** Diatonic degrees in a major key (scale steps are semitones above tonic). */
export const MAJOR_DEGREES = [
  { num: 1, roman: 'I', scaleStep: 0, triad: '', seventh: 'maj7', extended: 'maj9' },
  { num: 2, roman: 'ii', scaleStep: 2, triad: 'm', seventh: 'm7', extended: 'm7' },
  { num: 3, roman: 'iii', scaleStep: 4, triad: 'm', seventh: 'm7', extended: 'm7' },
  { num: 4, roman: 'IV', scaleStep: 5, triad: '', seventh: 'maj7', extended: 'maj7' },
  { num: 5, roman: 'V', scaleStep: 7, triad: '', seventh: '7', extended: '9' },
  { num: 6, roman: 'vi', scaleStep: 9, triad: 'm', seventh: 'm7', extended: 'm7' },
  { num: 7, roman: 'vii°', scaleStep: 11, triad: 'dim', seventh: 'm7b5', extended: 'm7b5' },
];

/** Functional minor: natural-minor i, ii°, III, iv, VI, with harmonic-minor V and vii°. */
export const MINOR_DEGREES = [
  { num: 1, roman: 'i', scaleStep: 0, triad: 'm', seventh: 'm7', extended: 'm7' },
  { num: 2, roman: 'ii°', scaleStep: 2, triad: 'dim', seventh: 'm7b5', extended: 'm7b5' },
  { num: 3, roman: 'III', scaleStep: 3, triad: '', seventh: 'maj7', extended: 'maj7' },
  { num: 4, roman: 'iv', scaleStep: 5, triad: 'm', seventh: 'm7', extended: 'm7' },
  { num: 5, roman: 'V', scaleStep: 7, triad: '', seventh: '7', extended: '9' },
  { num: 6, roman: 'VI', scaleStep: 8, triad: '', seventh: 'maj7', extended: 'maj7' },
  { num: 7, roman: 'vii°', scaleStep: 11, triad: 'dim', seventh: 'dim7', extended: 'dim7' },
];

export const TRAINING_KEYS = ['C', 'G', 'F', 'D', 'A', 'Bb', 'Eb'];

/** Correct note spellings per major key (index 0 = tonic / degree 1). */
export const KEY_SCALE_SPELLINGS = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
};

/** Harmonic-minor spellings (raised leading tone) for the same training keys. */
export const MINOR_KEY_SPELLINGS = {
  C: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'],
  G: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F#'],
  F: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'],
  D: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C#'],
  A: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
  Bb: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'A'],
  Eb: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'D'],
};

/**
 * Named progressions. Degree numbers are the same in major and minor;
 * Roman numerals and qualities come from the mode's degree table.
 * Every pattern, including its minor variant, requires Pro.
 */
export const PROGRESSION_CATALOG = Object.freeze([
  Object.freeze({ id: 'I-IV-V-I', degrees: Object.freeze([1, 4, 5, 1]), access: 'pro' }),
  Object.freeze({ id: 'ii-V-I', degrees: Object.freeze([2, 5, 1]), access: 'pro' }),
  Object.freeze({ id: 'I-V-vi-IV', degrees: Object.freeze([1, 5, 6, 4]), access: 'pro' }),
  Object.freeze({ id: 'I-vi-IV-V', degrees: Object.freeze([1, 6, 4, 5]), access: 'pro' }),
]);

export function getProgressionById(id) {
  return PROGRESSION_CATALOG.find((item) => item.id === id) || null;
}

export function formatProgressionPattern(id, quality = 'major') {
  const item = getProgressionById(id);
  if (!item) return '';
  return item.degrees.map((num) => getDegreeByNum(num, quality).roman).join('–');
}

export function degreeTable(quality = 'major') {
  return quality === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;
}

export function getDegreeByNum(num, quality = 'major') {
  const table = degreeTable(quality);
  return table.find((d) => d.num === num) || table[0];
}

export function getRootForDegree(keyRoot, degree, quality = 'major') {
  const spelling = quality === 'minor' ? MINOR_KEY_SPELLINGS[keyRoot] : KEY_SCALE_SPELLINGS[keyRoot];
  if (spelling) {
    let idx = 0;
    if (degree?.num != null) {
      idx = degree.num - 1;
    } else if (degree?.scaleStep != null) {
      const match = degreeTable(quality).find((d) => d.scaleStep === degree.scaleStep);
      idx = match ? match.num - 1 : 0;
    }
    if (idx >= 0 && idx < spelling.length) return spelling[idx];
  }
  // Fallback: pitch-class map (sharp spellings) if key is unknown
  const tonicPc = NOTE_TO_PC[keyRoot];
  if (tonicPc === undefined) return 'C';
  return PC_TO_NOTE[(tonicPc + (degree?.scaleStep || 0)) % 12];
}

function getChordTypeForTier(degree, tier, random = Math.random) {
  if (tier === 'basic') return degree.triad;
  if (tier === 'seventh') return degree.seventh;
  if (tier === 'extended') return degree.extended;
  const options = [degree.triad, degree.seventh, degree.extended];
  return options[Math.floor(random() * options.length)];
}

export function buildDiatonicChord(keyRoot, degreeNum, tier, random = Math.random, quality = 'major') {
  const degree = getDegreeByNum(degreeNum, quality);
  const root = getRootForDegree(keyRoot, degree, quality);
  const type = getChordTypeForTier(degree, tier, random);
  return {
    degreeNum: degree.num,
    roman: degree.roman,
    root,
    type,
    name: root + type,
    quality,
  };
}

function resolveCatalogItem(progressionId, allowedIds, random) {
  const pool = Array.isArray(allowedIds)
    ? PROGRESSION_CATALOG.filter((item) => allowedIds.includes(item.id))
    : PROGRESSION_CATALOG;
  if (!pool.length) return null;
  if (progressionId) {
    const found = pool.find((item) => item.id === progressionId);
    if (found) return found;
  }
  return pool[Math.floor(random() * pool.length)] || null;
}

function resolveQuality(quality, random) {
  if (quality === 'major' || quality === 'minor') return quality;
  return random() < 0.5 ? 'major' : 'minor';
}

function resolveKey(keyRoot, random) {
  if (keyRoot && TRAINING_KEYS.includes(keyRoot)) return keyRoot;
  return TRAINING_KEYS[Math.floor(random() * TRAINING_KEYS.length)];
}

/**
 * One ear-training item: a catalog progression in a major or minor key.
 * Key and mode are random unless the caller pins them (retry, tests).
 * `random` is consumed only for fields that were not pinned, then once per
 * chord when the difficulty tier picks among qualities.
 */
export function generateProgressionQuestion({
  keyRoot = null,
  tier = 'basic',
  lastLabel = null,
  progressionId = null,
  quality = null,
  allowedIds = null,
  random = Math.random,
} = {}) {
  let degreeNums;
  let chords;
  let label;
  let resolvedId;
  let resolvedQuality;
  let resolvedKey;
  let attempts = 0;

  do {
    const item = resolveCatalogItem(progressionId, allowedIds, random);
    if (!item) return null;
    resolvedId = item.id;
    resolvedQuality = resolveQuality(quality, random);
    resolvedKey = resolveKey(keyRoot, random);
    degreeNums = [...item.degrees];
    chords = degreeNums.map((num) => (
      buildDiatonicChord(resolvedKey, num, tier, random, resolvedQuality)
    ));
    label = `${resolvedKey} ${resolvedQuality}: ${chords.map((c) => c.roman).join('-')}`;
    attempts += 1;
  } while (label === lastLabel && attempts < 40);

  const tonic = buildDiatonicChord(resolvedKey, 1, tier, () => 0, resolvedQuality);
  const voicings = voiceLeadProgression(chords);

  return {
    progressionId: resolvedId,
    access: getProgressionById(resolvedId)?.access || 'pro',
    quality: resolvedQuality,
    keyRoot: resolvedKey,
    tier,
    degreeNums,
    chords,
    tonic,
    tonicVoicing: voiceLeadProgression([tonic])[0],
    voicings,
    label,
    length: degreeNums.length,
  };
}

export function formatProgressionAnswer(degreeNums, quality = 'major') {
  return degreeNums.map((num) => getDegreeByNum(num, quality).roman).join(' → ');
}

export function isProgressionAnswerCorrect(answerNums, correctNums) {
  if (!answerNums || !correctNums || answerNums.length !== correctNums.length) return false;
  return answerNums.every((num, i) => num === correctNums[i]);
}

/** Prefer the sounding quality from the current question when previewing a degree. */
export function resolveDegreeChord(keyRoot, degreeNum, tier, questionChords = [], quality = 'major') {
  const fromQuestion = questionChords.find((c) => c.degreeNum === degreeNum);
  if (fromQuestion) return fromQuestion;
  return buildDiatonicChord(keyRoot, degreeNum, tier, () => 0, quality);
}
