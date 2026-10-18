import { describe, it, expect } from 'vitest';
import {
  TRIAL_DAYS,
  TRIAL_MS,
  ensureTrialStarted,
  getTrialStatus,
  hasProAccess,
  readTrialStart,
} from '../lib/trial.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

describe('pro free trial', () => {
  it('is seven days long', () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(TRIAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('starts once and stays active inside the window', () => {
    const storage = new MemoryStorage();
    const t0 = 1_700_000_000_000;
    expect(ensureTrialStarted(storage, t0)).toBe(t0);
    expect(ensureTrialStarted(storage, t0 + 1000)).toBe(t0);
    expect(readTrialStart(storage)).toBe(t0);
    const mid = getTrialStatus(storage, t0 + TRIAL_MS - 1000);
    expect(mid.active).toBe(true);
    expect(mid.daysRemaining).toBeGreaterThanOrEqual(1);
    const after = getTrialStatus(storage, t0 + TRIAL_MS + 1);
    expect(after.active).toBe(false);
    expect(after.daysRemaining).toBe(0);
  });

  it('grants Pro access during trial or after purchase', () => {
    expect(hasProAccess(true, { active: false })).toBe(true);
    expect(hasProAccess(false, { active: true })).toBe(true);
    expect(hasProAccess(false, { active: false })).toBe(false);
  });
});
