import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LANG,
  LANGUAGES,
  STRINGS,
  applyDocumentLang,
  htmlLangFor,
  isSupportedLang,
  loadLang,
  saveLang,
  t,
} from '../lib/i18n.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = v; }
}

describe('i18n', () => {
  it('defaults to English', () => {
    expect(DEFAULT_LANG).toBe('en');
    expect(t('en', 'tab.test')).toBe('Identify');
    expect(t('en', 'settings.support')).toBe('Support the app');
    expect(t('zh-Hant', 'support.blurb')).toContain('免費');
  });

  it('translates Traditional and Simplified Chinese', () => {
    expect(t('zh-Hant', 'tab.test')).toBe('辨識');
    expect(t('zh-Hans', 'tab.test')).toBe('识别');
    expect(t('zh-Hant', 'stats.resetConfirm')).toBe('重設');
    expect(t('zh-Hans', 'stats.resetConfirm')).toBe('重置');
  });

  it('interpolates variables and falls back to English', () => {
    expect(t('en', 'live.correctNamed', { name: 'Cmaj7' })).toBe('Correct: Cmaj7');
    expect(t('zh-Hant', 'progression.chordN', { n: 2 })).toBe('第 2 個和弦');
    expect(t('unknown', 'tab.stats')).toBe('Stats');
    expect(t('en', 'missing.key')).toBe('missing.key');
  });

  it('keeps the same keys across languages', () => {
    const enKeys = Object.keys(STRINGS.en).sort();
    for (const lang of LANGUAGES) {
      expect(Object.keys(STRINGS[lang.id]).sort()).toEqual(enKeys);
    }
  });

  it('loads, saves, and rejects unsupported languages', () => {
    const storage = new MemoryStorage();
    expect(loadLang(storage)).toBe('en');
    expect(saveLang('zh-Hant', storage)).toBe(true);
    expect(loadLang(storage)).toBe('zh-Hant');
    expect(saveLang('fr', storage)).toBe(false);
    expect(isSupportedLang('en')).toBe(true);
    expect(isSupportedLang('ja')).toBe(false);
    expect(htmlLangFor('zh-Hans')).toBe('zh-Hans');
    expect(htmlLangFor('nope')).toBe('en');
  });

  it('applies the html lang attribute', () => {
    const el = { lang: 'zh-Hant' };
    applyDocumentLang('en', { documentElement: el });
    expect(el.lang).toBe('en');
    applyDocumentLang('zh-Hant', { documentElement: el });
    expect(el.lang).toBe('zh-Hant');
  });
});
