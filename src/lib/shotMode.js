import { LANG_KEY, isSupportedLang, saveLang } from './i18n.js';
import { STATS_KEY, saveStats } from './stats.js';

const SHOT_TABS = new Set(['test', 'ear', 'progression', 'stats']);

export const SCREENSHOT_STATS = {
  totalCorrect: 24,
  totalAnswered: 31,
  bestStreak: 7,
  earCorrect: 12,
  achievements: ['first', 'streak10', 'ear10'],
  chordHistory: {
    G7: { correct: 4, wrong: 4, kind: 'chord' },
    Fmaj7: { correct: 3, wrong: 2, kind: 'chord' },
    Am: { correct: 5, wrong: 3, kind: 'chord' },
    Dm: { correct: 4, wrong: 1, kind: 'chord' },
    C: { correct: 8, wrong: 1, kind: 'chord' },
  },
};

export function readShotConfig(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return null;
  const fromWindow = win.__SHOT__ && typeof win.__SHOT__ === 'object' ? win.__SHOT__ : {};
  let params = new URLSearchParams();
  try {
    params = new URLSearchParams(win.location?.search || '');
  } catch {
    // ignore
  }
  const tab = fromWindow.tab || params.get('tab');
  const lang = fromWindow.lang || params.get('lang');
  const settings = fromWindow.settings === true || params.get('settings') === '1';
  const seedStats = fromWindow.seedStats === true || params.get('seedStats') === '1';
  if (!tab && !lang && !settings && !seedStats) return null;
  return {
    tab: SHOT_TABS.has(tab) ? tab : null,
    lang: isSupportedLang(lang) ? lang : null,
    settings,
    seedStats,
  };
}

export function applyShotConfig(win = typeof window !== 'undefined' ? window : null) {
  const shot = readShotConfig(win);
  if (!shot) return null;
  const storage = win?.localStorage;
  if (shot.lang) saveLang(shot.lang, storage);
  if (shot.seedStats) saveStats(SCREENSHOT_STATS, storage);
  return shot;
}

export { LANG_KEY, STATS_KEY, SHOT_TABS };
