import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_ORDER,
  nextDifficulty,
  RAMP_CLEAN_STREAK,
  RAMP_MISS_STREAK,
} from '../lib/difficultyRamp.js';

describe('difficulty ramp', () => {
  it('uses the existing difficulty order', () => {
    expect(DIFFICULTY_ORDER).toEqual(['basic', 'seventh', 'extended', 'all']);
  });

  it('raises after a clean streak and lowers after misses', () => {
    expect(nextDifficulty({
      current: 'basic',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toBe('seventh');
    expect(nextDifficulty({
      current: 'all',
      cleanStreak: 10,
      missStreak: 0,
    })).toBe('all');
    expect(nextDifficulty({
      current: 'seventh',
      cleanStreak: 0,
      missStreak: RAMP_MISS_STREAK,
    })).toBe('basic');
    expect(nextDifficulty({
      current: 'basic',
      missStreak: 5,
    })).toBe('basic');
  });

  it('prefers easing over a promotion when both thresholds are met', () => {
    expect(nextDifficulty({
      current: 'extended',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: RAMP_MISS_STREAK,
    })).toBe('seventh');
  });

  it('leaves unknown levels unchanged', () => {
    expect(nextDifficulty({ current: 'custom', cleanStreak: 9, missStreak: 9 })).toBe('custom');
  });
});
