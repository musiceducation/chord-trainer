import { normalizeRomanTier } from './abrsm.js';
import { DIFFICULTY_LEVELS } from './constants.js';
import { TRAINING_KEYS } from './diatonic.js';
import { DEFAULT_EAR_QUALITY_POOL, normalizeEarQualityPool } from './earQuality.js';
import { DEFAULT_PIANO_SOUND, normalizePianoSound } from './pianoSamples.js';

export const ANSWER_SURFACES = Object.freeze(['keyboard', 'noteNames']);

export const SETTINGS_KEY = 'chordTrainerSettings';

export const DEFAULT_FIRST_HINT_USED = {
  identify: false,
  ear: false,
  progress: false,
};

export const DEFAULT_SETTINGS = {
  difficulty: 'basic',
  keyRoot: 'C',
  pianoSound: DEFAULT_PIANO_SOUND,
  onboardingDone: false,
  firstHintUsed: { ...DEFAULT_FIRST_HINT_USED },
  answerSurface: 'keyboard',
  romanTier: 'easy',
  identifyInversions: false,
  romanInversions: false,
  earQualityPool: [...DEFAULT_EAR_QUALITY_POOL],
};

function isValidDifficulty(value) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTY_LEVELS, value);
}

function isValidKeyRoot(value) {
  return TRAINING_KEYS.includes(value);
}

function isValidAnswerSurface(value) {
  return ANSWER_SURFACES.includes(value);
}

function normalizeFirstHintUsed(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    identify: src.identify === true,
    ear: src.ear === true,
    progress: src.progress === true,
  };
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SETTINGS,
      firstHintUsed: { ...DEFAULT_FIRST_HINT_USED },
      earQualityPool: [...DEFAULT_EAR_QUALITY_POOL],
    };
  }
  return {
    difficulty: isValidDifficulty(raw.difficulty) ? raw.difficulty : DEFAULT_SETTINGS.difficulty,
    keyRoot: isValidKeyRoot(raw.keyRoot) ? raw.keyRoot : DEFAULT_SETTINGS.keyRoot,
    pianoSound: normalizePianoSound(raw.pianoSound),
    onboardingDone: raw.onboardingDone === true,
    firstHintUsed: normalizeFirstHintUsed(raw.firstHintUsed),
    answerSurface: isValidAnswerSurface(raw.answerSurface) ? raw.answerSurface : DEFAULT_SETTINGS.answerSurface,
    romanTier: normalizeRomanTier(raw.romanTier),
    identifyInversions: raw.identifyInversions === true,
    romanInversions: raw.romanInversions === true,
    earQualityPool: normalizeEarQualityPool(raw.earQualityPool),
  };
}

export function loadSettings(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
