import { ACHIEVEMENTS } from './constants.js';

export const STATS_KEY = 'chordTrainerStats_v2';
export const LEGACY_STATS_KEY = 'chordTrainerStats_v1';

export const DEFAULT_STATS = {
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  earCorrect: 0,
  chordHistory: {},
  achievements: [],
};

export function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATS };
  return {
    totalCorrect: Number(raw.totalCorrect) || 0,
    totalAnswered: Number(raw.totalAnswered) || 0,
    bestStreak: Number(raw.bestStreak) || 0,
    earCorrect: Number(raw.earCorrect) || 0,
    chordHistory: raw.chordHistory && typeof raw.chordHistory === 'object' ? { ...raw.chordHistory } : {},
    achievements: Array.isArray(raw.achievements) ? [...raw.achievements] : [],
  };
}

export function loadStats(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return { ...DEFAULT_STATS };
  try {
    const raw = storage.getItem(STATS_KEY) || storage.getItem(LEGACY_STATS_KEY);
    if (raw) return normalizeStats(JSON.parse(raw));
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULT_STATS };
}

export function saveStats(stats, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    storage.setItem(STATS_KEY, JSON.stringify(normalizeStats(stats)));
    return true;
  } catch {
    return false;
  }
}

export function computeAccuracy(stats) {
  if (!stats.totalAnswered) return 0;
  return Math.round((stats.totalCorrect / stats.totalAnswered) * 100);
}

export function recordWrongAttempt(stats, chordName) {
  const ns = normalizeStats(stats);
  ns.totalAnswered += 1;
  ns.chordHistory = { ...ns.chordHistory };
  const ch = ns.chordHistory[chordName] || { correct: 0, wrong: 0 };
  ns.chordHistory[chordName] = { ...ch, wrong: ch.wrong + 1 };
  return ns;
}

export function recordSkip(stats) {
  const ns = normalizeStats(stats);
  ns.totalAnswered += 1;
  return ns;
}

export function recordCorrectAttempt(stats, {
  chordName,
  newStreak,
  isEarMode = false,
}) {
  const ns = normalizeStats(stats);
  ns.totalCorrect += 1;
  ns.totalAnswered += 1;
  if (isEarMode) ns.earCorrect += 1;
  if (newStreak > ns.bestStreak) ns.bestStreak = newStreak;

  ns.chordHistory = { ...ns.chordHistory };
  const ch = ns.chordHistory[chordName] || { correct: 0, wrong: 0 };
  ns.chordHistory[chordName] = { ...ch, correct: ch.correct + 1 };

  ns.achievements = [...(ns.achievements || [])];
  ACHIEVEMENTS.forEach((a) => {
    if (ns.achievements.includes(a.id)) return;
    if (a.type === 'correct' && ns.totalCorrect >= a.threshold) ns.achievements.push(a.id);
    if (a.type === 'streak' && newStreak >= a.threshold) ns.achievements.push(a.id);
    if (a.type === 'ear' && ns.earCorrect >= a.threshold) ns.achievements.push(a.id);
  });

  return ns;
}

export function computeStreakAfterSuccess(streak, hasFailed) {
  return hasFailed ? 0 : streak + 1;
}

export function computeStreakAfterWrong() {
  return 0;
}
