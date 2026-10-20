import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
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
      onboardingDone: false,
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      readTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
    });
    expect(normalizeSettings({ difficulty: 'nope', keyRoot: 'Z' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ difficulty: 'seventh', keyRoot: 'Bb' })).toEqual({
      difficulty: 'seventh',
      keyRoot: 'Bb',
      pianoSound: 'acoustic',
      onboardingDone: false,
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      readTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
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
  });

  it('loads and saves settings', () => {
    const storage = new MemoryStorage();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ difficulty: 'all', keyRoot: 'Eb' }, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual({
      difficulty: 'all',
      keyRoot: 'Eb',
      pianoSound: 'acoustic',
      onboardingDone: false,
      firstHintUsed: { identify: false, ear: false, progress: false },
      answerSurface: 'keyboard',
      romanTier: 'easy',
      readTier: 'easy',
      identifyInversions: false,
      romanInversions: false,
    });
  });
});
