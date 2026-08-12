import { describe, it, expect } from 'vitest';
import {
  normalizeStats,
  loadStats,
  saveStats,
  recordWrongAttempt,
  recordSkip,
  recordCorrectAttempt,
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  computeAccuracy,
  DEFAULT_STATS,
} from '../lib/stats.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = v; }
}

describe('stats', () => {
  it('normalizes partial data', () => {
    const stats = normalizeStats({ totalCorrect: '5' });
    expect(stats.totalCorrect).toBe(5);
    expect(stats.chordHistory).toEqual({});
    expect(stats.achievements).toEqual([]);
  });

  it('loads and saves with migration from legacy key', () => {
    const storage = new MemoryStorage();
    storage.setItem('chordTrainerStats_v1', JSON.stringify({ totalCorrect: 3, totalAnswered: 4 }));
    const loaded = loadStats(storage);
    expect(loaded.totalCorrect).toBe(3);
    saveStats(loaded, storage);
    expect(storage.getItem('chordTrainerStats_v2')).toBeTruthy();
  });

  it('records wrong attempts in accuracy denominator', () => {
    const afterWrong = recordWrongAttempt(DEFAULT_STATS, 'Cmaj7');
    expect(afterWrong.totalAnswered).toBe(1);
    expect(afterWrong.chordHistory.Cmaj7.wrong).toBe(1);
  });

  it('records skip as answered attempt', () => {
    const afterSkip = recordSkip(DEFAULT_STATS);
    expect(afterSkip.totalAnswered).toBe(1);
    expect(afterSkip.totalCorrect).toBe(0);
  });

  it('records correct attempt with streak and achievements', () => {
    const after = recordCorrectAttempt(DEFAULT_STATS, {
      chordName: 'C',
      newStreak: 1,
      isEarMode: true,
    });
    expect(after.totalCorrect).toBe(1);
    expect(after.earCorrect).toBe(1);
    expect(after.achievements).toContain('first');
  });

  it('resets streak after failure in round', () => {
    expect(computeStreakAfterSuccess(4, true)).toBe(0);
    expect(computeStreakAfterSuccess(4, false)).toBe(5);
    expect(computeStreakAfterWrong()).toBe(0);
  });

  it('computes accuracy', () => {
    expect(computeAccuracy({ totalCorrect: 3, totalAnswered: 4 })).toBe(75);
  });
});
