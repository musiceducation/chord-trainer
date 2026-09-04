import { DIFFICULTY_LEVELS } from './constants.js';
import { TRAINING_KEYS } from './diatonic.js';

export const SETTINGS_KEY = 'chordTrainerSettings';

export const DEFAULT_SETTINGS = {
  difficulty: 'basic',
  keyRoot: 'C',
};

function isValidDifficulty(value) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTY_LEVELS, value);
}

function isValidKeyRoot(value) {
  return TRAINING_KEYS.includes(value);
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    difficulty: isValidDifficulty(raw.difficulty) ? raw.difficulty : DEFAULT_SETTINGS.difficulty,
    keyRoot: isValidKeyRoot(raw.keyRoot) ? raw.keyRoot : DEFAULT_SETTINGS.keyRoot,
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
