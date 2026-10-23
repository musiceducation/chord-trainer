import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LANG,
  LANG_KEY,
  LANGUAGES,
  STRINGS,
  applyDocumentLang,
  htmlLangFor,
  isSupportedLang,
  loadLang,
  resolveInitialLang,
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
    expect(t('en', 'settings.language')).toBe('Language');
    expect(t('en', 'onboarding.replay')).toBe('Replay beginner guide');
    expect(t('zh-Hant', 'onboarding.replay')).toBe('重看新手引導');
    expect(t('zh-Hant', 'pack.name')).toBe('新手 5 題');
    expect(t('zh-Hant', 'guide.oneLiner.test')).toBe('看和弦名稱 → 在鋼琴上彈出');
    expect(t('zh-Hant', 'settings.language')).toBe('語言');
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

  it('allows real StoreKit IAP keys and still bans unpaid tip wording', () => {
    const banned = /tip|donate|donation|小費|小费|內購|内购/i;
    const required = [
      'pro.name',
      'pro.buy',
      'pro.unlocked',
      'pro.restore',
      'pro.paywallTitle',
      'pro.paywallBody',
      'pro.priceUnavailable',
      'pro.trialActive',
      'pro.trialEnded',
      'pro.trialOffer',
      'settings.pianoSound',
      'sound.acoustic',
      'sound.electric',
      'support.section',
      'support.disclaimer',
      'support.small',
      'support.large',
      'iap.unavailable',
      'iap.thanks',
      'iap.restoreNone',
      'ramp.proNudge',
      'stats.fullLocked',
    ];
    for (const lang of LANGUAGES) {
      for (const key of required) {
        expect(STRINGS[lang.id][key], `${lang.id}:${key}`).toBeTruthy();
      }
      expect(STRINGS[lang.id]['settings.support']).toBeUndefined();
      for (const [key, value] of Object.entries(STRINGS[lang.id])) {
        expect(value, `${lang.id}:${key}`).not.toMatch(banned);
      }
    }
    expect(STRINGS.en['support.disclaimer']).toMatch(/unlock no features/i);
    expect(STRINGS['zh-Hant']['support.disclaimer']).toMatch(/不會解鎖/);
    expect(STRINGS.en['pro.paywallBody']).toMatch(/7-day free trial/i);
    expect(STRINGS.en['pro.paywallBody']).toMatch(/month/i);
    expect(STRINGS.en['pro.paywallBody']).toMatch(/progressions/i);
    expect(STRINGS['zh-Hant']['pro.paywallBody']).toMatch(/七日/);
    expect(STRINGS['zh-Hant']['pro.paywallBody']).toMatch(/每月/);
    expect(STRINGS['zh-Hant']['pro.paywallBody']).toMatch(/和弦進行/);
    expect(STRINGS.en['sound.electricBright']).toBeTruthy();
    expect(STRINGS.en['sound.organ']).toBeTruthy();
    expect(STRINGS['zh-Hans']['pro.paywallBody']).toBe(STRINGS['zh-Hant']['pro.paywallBody']);
    expect(STRINGS['zh-Hans']['support.disclaimer']).toBe(STRINGS['zh-Hant']['support.disclaimer']);
  });

  it('loads, saves, and rejects unsupported languages', () => {
    const storage = new MemoryStorage();
    expect(loadLang(storage)).toBe('en');
    expect(saveLang('zh-Hant', storage)).toBe(true);
    expect(loadLang(storage)).toBe('zh-Hant');
    expect(saveLang('zh-Hans', storage)).toBe(true);
    expect(loadLang(storage)).toBe('zh-Hans');
    expect(saveLang('fr', storage)).toBe(false);
    expect(isSupportedLang('en')).toBe(true);
    expect(isSupportedLang('ja')).toBe(false);
    expect(htmlLangFor('zh-Hans')).toBe('zh-Hans');
    expect(htmlLangFor('nope')).toBe('en');
    expect(LANGUAGES.map((lang) => lang.id)).toEqual(['en', 'zh-Hant', 'zh-Hans']);
  });

  it('opens in English on first launch even when the device prefers Chinese', () => {
    const storage = new MemoryStorage();
    const deviceLanguages = ['zh-TW', 'zh-Hant', 'zh-HK', 'zh-CN', 'zh-Hans', 'en-US'];
    expect(storage.getItem(LANG_KEY)).toBeNull();
    expect(resolveInitialLang(deviceLanguages)).toBe('en');
    const lang = loadLang(storage, deviceLanguages);
    expect(lang).toBe('en');
    expect(storage.getItem(LANG_KEY)).toBeNull();
    expect(t(lang, 'tab.test')).toBe('Identify');
    expect(t(lang, 'tab.ear')).toBe('Train');
    expect(t(lang, 'tab.abrsm')).toBe('Roman');
    expect(t(lang, 'tab.progression')).toBe('Progress');
    expect(t(lang, 'onboarding.welcomeTitle')).toBe('Welcome to Chord Trainer');
    expect(t(lang, 'onboarding.start')).toBe('Start');
    expect(t(lang, 'settings.language')).toBe('Language');
    storage.setItem(LANG_KEY, 'zh-TW');
    expect(loadLang(storage, ['zh-Hant', 'zh-TW'])).toBe('en');
    storage.setItem(LANG_KEY, '');
    expect(loadLang(storage, ['zh-Hant'])).toBe('en');
    expect(loadLang(null, ['zh-Hant'])).toBe('en');
  });

  it('keeps a saved Chinese preference over the device language', () => {
    const storage = new MemoryStorage();
    expect(saveLang('zh-Hant', storage)).toBe(true);
    expect(loadLang(storage, ['en-US', 'en'])).toBe('zh-Hant');
    expect(t(loadLang(storage, ['en']), 'tab.test')).toBe('辨識');
    expect(saveLang('zh-Hans', storage)).toBe(true);
    expect(loadLang(storage, ['zh-Hant', 'en'])).toBe('zh-Hans');
    expect(t(loadLang(storage, ['en']), 'tab.test')).toBe('识别');
  });

  it('applies the html lang attribute', () => {
    const el = { lang: 'zh-Hant' };
    applyDocumentLang('en', { documentElement: el });
    expect(el.lang).toBe('en');
    applyDocumentLang('zh-Hant', { documentElement: el });
    expect(el.lang).toBe('zh-Hant');
  });

  it('keeps Traditional Chinese in written Chinese, not Cantonese colloquial', () => {
    const colloquial = /[咗嚟嘅冇唔喺嗰啲啱嘞囉咩佢哋畀俾睇喇嘢吖啫噉咁吔喎]/;
    const bannedPhrases = ['多謝', '好嘢', '高手在線', '再玩', '仲欠', '彈出嚟', '點一下', '開音'];
    for (const [key, value] of Object.entries(STRINGS['zh-Hant'])) {
      expect(value, key).not.toMatch(colloquial);
      for (const phrase of bannedPhrases) {
        expect(value, `${key} contains ${phrase}`).not.toContain(phrase);
      }
    }
    expect(t('zh-Hant', 'live.wrongExtra', { extra: 'F' })).toBe('多了：F');
    expect(t('zh-Hant', 'live.wrongMissing', { missing: 'G' })).toBe('尚缺：G');
    expect(t('zh-Hant', 'onboarding.celebrateTitle')).toBe('很好！');
    expect(t('zh-Hant', 'onboarding.perfectTitle')).toBe('已準備就緒');
    expect(t('zh-Hant', 'guide.oneLiner.ear')).toBe('聆聽後 → 再彈出');
    expect(t('zh-Hant', 'pack.doneBody')).toBe('之後可在此處或設定中再次練習。');
    expect(t('zh-Hant', 'iap.thanks')).toBe('感謝！');
    expect(t('en', 'guide.oneLiner.test')).toBe('Read the name → play it on the piano');
  });
});
