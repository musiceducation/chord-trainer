import { describe, it, expect } from 'vitest';
import { applyShotConfig, readShotConfig, SCREENSHOT_STATS } from '../lib/shotMode.js';
import { STATS_KEY } from '../lib/stats.js';
import { LANG_KEY } from '../lib/i18n.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
}

describe('shotMode', () => {
  it('reads tab, language, settings, and stats flags', () => {
    const win = {
      __SHOT__: { tab: 'progression', lang: 'zh-Hant', settings: true },
      location: { search: '?seedStats=1' },
    };
    expect(readShotConfig(win)).toEqual({
      tab: 'progression',
      lang: 'zh-Hant',
      settings: true,
      seedStats: true,
    });
  });

  it('writes language and seeded stats for screenshot capture', () => {
    const storage = new MemoryStorage();
    const win = {
      __SHOT__: { tab: 'stats', lang: 'zh-Hant', seedStats: true },
      location: { search: '' },
      localStorage: storage,
    };
    const shot = applyShotConfig(win);
    expect(shot.tab).toBe('stats');
    expect(storage.getItem(LANG_KEY)).toBe('zh-Hant');
    expect(JSON.parse(storage.getItem(STATS_KEY)).totalCorrect).toBe(SCREENSHOT_STATS.totalCorrect);
  });
});
