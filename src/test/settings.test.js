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
    expect(DEFAULT_SETTINGS).toEqual({ difficulty: 'basic', keyRoot: 'C' });
    expect(normalizeSettings({ difficulty: 'nope', keyRoot: 'Z' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ difficulty: 'seventh', keyRoot: 'Bb' })).toEqual({
      difficulty: 'seventh',
      keyRoot: 'Bb',
    });
  });

  it('loads and saves settings', () => {
    const storage = new MemoryStorage();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ difficulty: 'all', keyRoot: 'Eb' }, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual({ difficulty: 'all', keyRoot: 'Eb' });
  });
});
