import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '../lib/settings.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = v; }
}

describe('settings', () => {
  it('defaults and normalizes invalid values', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      difficulty: 'basic',
      keyRoot: 'C',
      pianoSound: 'acoustic',
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
      earQualityPool: ['', 'm', 'aug', 'dim'],
    });
    expect(normalizeSettings({ difficulty: 'nope', keyRoot: 'Z' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ difficulty: 'seventh', keyRoot: 'Bb' })).toEqual({
      difficulty: 'seventh',
      keyRoot: 'Bb',
      pianoSound: 'acoustic',
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
      earQualityPool: ['', 'm', 'aug', 'dim'],
    });
    expect(normalizeSettings({
      answerSurface: 'noteNames',
      romanTier: 'hard',
      identifyInversions: true,
      romanInversions: true,
    })).toMatchObject({
      answerSurface: 'noteNames',
      romanTier: 'hard',
      identifyInversions: true,
      romanInversions: true,
    });
    expect(normalizeSettings({ answerSurface: 'buttons', romanTier: 'aug' }).answerSurface).toBe('keyboard');
    expect(normalizeSettings({ romanTier: 'III+' }).romanTier).toBe('easy');
    expect(normalizeSettings({ romanTier: 'basic' }).romanTier).toBe('easy');
    expect(normalizeSettings({ romanTier: 'v7' }).romanTier).toBe('medium');
    expect(normalizeSettings({ romanTier: 'vOfV' }).romanTier).toBe('hard');
    expect(normalizeSettings({ pianoSound: 'electric' }).pianoSound).toBe('electric');
    expect(normalizeSettings({ pianoSound: 'nope' }).pianoSound).toBe('acoustic');
    expect(normalizeSettings({ onboardingDone: true }).onboardingDone).toBeUndefined();
  });

  it('drops a stored beginner onboarding flag and keeps the first-hint flag', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({
      difficulty: 'seventh',
      onboardingDone: false,
      firstHintUsed: { identify: true, ear: false, progress: true },
    }));
    const loaded = loadSettings(storage);
    expect(loaded.onboardingDone).toBeUndefined();
    expect(loaded.difficulty).toBe('seventh');
    expect(loaded.firstHintUsed).toEqual({ identify: true, ear: false, progress: true });
    expect(JSON.parse(storage.getItem(SETTINGS_KEY)).onboardingDone).toBeUndefined();
    expect(saveSettings({ ...loaded, onboardingDone: true }, storage)).toBe(true);
    expect(JSON.parse(storage.getItem(SETTINGS_KEY)).onboardingDone).toBeUndefined();
  });

  it('loads and saves settings', () => {
    const storage = new MemoryStorage();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ difficulty: 'all', keyRoot: 'Eb' }, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual({
      difficulty: 'all',
      keyRoot: 'Eb',
      pianoSound: 'acoustic',
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
      earQualityPool: ['', 'm', 'aug', 'dim'],
    });
  });
});
