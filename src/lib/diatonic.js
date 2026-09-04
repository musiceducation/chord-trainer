import { NOTE_TO_PC, PC_TO_NOTE } from './constants.js';

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

const COMMON_PROGRESSIONS = [
  [1, 5, 6, 4],
  [1, 6, 4, 5],
  [2, 5, 1, 1],
  [1, 4, 1, 5],
  [6, 4, 1, 5],
  [1, 3, 4, 5],
  [4, 5, 1, 1],
  [1, 5, 4, 1],
  [1, 4, 5, 1],
  [2, 5, 1, 6],
];

const PROGRESSION_LENGTH = 4;

export function getDegreeByNum(num) {
  return MAJOR_DEGREES.find((d) => d.num === num) || MAJOR_DEGREES[0];
}

export function getRootForDegree(keyRoot, degree) {
  const spelling = KEY_SCALE_SPELLINGS[keyRoot];
  if (spelling) {
    let idx = 0;
    if (degree?.num != null) {
      idx = degree.num - 1;
    } else if (degree?.scaleStep != null) {
      const match = MAJOR_DEGREES.find((d) => d.scaleStep === degree.scaleStep);
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

export function buildDiatonicChord(keyRoot, degreeNum, tier, random = Math.random) {
  const degree = getDegreeByNum(degreeNum);
  const root = getRootForDegree(keyRoot, degree);
  const type = getChordTypeForTier(degree, tier, random);
  return {
    degreeNum: degree.num,
    roman: degree.roman,
    root,
    type,
    name: root + type,
  };
}

function randomDiatonicProgression(random) {
  const degrees = [];
  for (let i = 0; i < PROGRESSION_LENGTH; i += 1) {
    degrees.push(1 + Math.floor(random() * 7));
  }
  return degrees;
}

function pickProgressionDegrees(random) {
  if (random() < 0.65) {
    const template = COMMON_PROGRESSIONS[Math.floor(random() * COMMON_PROGRESSIONS.length)];
    return [...template];
  }
  return randomDiatonicProgression(random);
}

export function generateProgressionQuestion({
  keyRoot = 'C',
  tier = 'basic',
  lastLabel = null,
  random = Math.random,
} = {}) {
  let degreeNums;
  let chords;
  let label;
  let attempts = 0;

  do {
    degreeNums = pickProgressionDegrees(random);
    chords = degreeNums.map((num) => buildDiatonicChord(keyRoot, num, tier, random));
    label = `${keyRoot}: ${chords.map((c) => c.roman).join('-')}`;
    attempts += 1;
  } while (label === lastLabel && attempts < 40);

  const tonic = buildDiatonicChord(keyRoot, 1, tier, random);

  return {
    keyRoot,
    tier,
    degreeNums,
    chords,
    tonic,
    label,
    length: PROGRESSION_LENGTH,
  };
}

export function formatProgressionAnswer(degreeNums) {
  return degreeNums.map((num) => getDegreeByNum(num).roman).join(' → ');
}

export function isProgressionAnswerCorrect(answerNums, correctNums) {
  if (answerNums.length !== correctNums.length) return false;
  return answerNums.every((num, i) => num === correctNums[i]);
}

/** Prefer the sounding quality from the current question when previewing a degree. */
export function resolveDegreeChord(keyRoot, degreeNum, tier, questionChords = []) {
  const fromQuestion = questionChords.find((c) => c.degreeNum === degreeNum);
  if (fromQuestion) return fromQuestion;
  return buildDiatonicChord(keyRoot, degreeNum, tier, () => 0);
}
