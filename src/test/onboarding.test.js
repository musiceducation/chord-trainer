import { describe, it, expect } from 'vitest';
import {
  BEGINNER_PACK,
  ONBOARDING_STEPS,
  earPracticeSpec,
  identifyPracticeSpec,
  initialGuideState,
  isGuideOverlayStep,
  isOnboardingPractice,
  markFirstHintUsed,
  packQuestionAt,
  tabForOnboardingStep,
  tabForPackIndex,
  tabsLocked,
} from '../lib/onboarding.js';
import { sequentialHintStarts } from '../lib/hintFlash.js';
import { targetPcsInChordOrder } from '../lib/chords.js';
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

describe('onboarding state', () => {
  it('starts first-run on the playable identify chord, not a welcome gate', () => {
    expect(initialGuideState(false)).toEqual({ kind: 'onboarding', step: ONBOARDING_STEPS.IDENTIFY });
    expect(initialGuideState(undefined)).toEqual({ kind: 'onboarding', step: ONBOARDING_STEPS.IDENTIFY });
    expect(isGuideOverlayStep(initialGuideState(false))).toBe(false);
    expect(isOnboardingPractice(initialGuideState(false))).toBe(true);
    expect(initialGuideState(true)).toBeNull();
    expect(initialGuideState(false, { shotActive: true })).toBeNull();
  });

  it('maps practice steps to tabs and locks navigation', () => {
    expect(tabForOnboardingStep(ONBOARDING_STEPS.IDENTIFY)).toBe('test');
    expect(tabForOnboardingStep(ONBOARDING_STEPS.TRAIN)).toBe('ear');
    expect(tabsLocked({ kind: 'onboarding', step: 'identify' })).toBe(true);
    expect(tabsLocked({ kind: 'onboarding', step: 'welcome' })).toBe(false);
    expect(isOnboardingPractice({ kind: 'onboarding', step: 'train' })).toBe(true);
    expect(isGuideOverlayStep({ kind: 'onboarding', step: 'perfect' })).toBe(true);
  });

  it('uses fixed easy triads for tutorial and the beginner pack', () => {
    expect(identifyPracticeSpec({ kind: 'onboarding', step: 'identify' })).toEqual({ root: 'C', type: '' });
    expect(identifyPracticeSpec({ kind: 'onboarding', step: 'celebrate' })).toEqual({ root: 'C', type: '' });
    expect(earPracticeSpec({ kind: 'onboarding', step: 'train' })).toEqual({ root: 'C', type: '' });
    expect(earPracticeSpec({ kind: 'onboarding', step: 'perfect' })).toEqual({ root: 'C', type: '' });
    expect(BEGINNER_PACK).toHaveLength(5);
    expect(BEGINNER_PACK.map((q) => q.root + q.type)).toEqual(['C', 'G', 'Am', 'C', 'G']);
    expect(BEGINNER_PACK.filter((q) => q.mode === 'test')).toHaveLength(3);
    expect(BEGINNER_PACK.filter((q) => q.mode === 'ear')).toHaveLength(2);
    expect(packQuestionAt(2).name).toBe('Am');
    expect(tabForPackIndex(3)).toBe('ear');
    expect([...packQuestionAt(0).pcs].sort()).toEqual([0, 4, 7]);
  });

  it('orders C major tones root → third → fifth', () => {
    expect(targetPcsInChordOrder('C', '')).toEqual([0, 4, 7]);
    expect(sequentialHintStarts(3)).toEqual([0, 510, 1020]);
  });

  it('marks first-hint flags per mode', () => {
    expect(markFirstHintUsed(DEFAULT_SETTINGS, 'identify')).toEqual({
      identify: true,
      ear: false,
      progress: false,
    });
  });
});

describe('settings beginner flags', () => {
  it('defaults onboarding and first-hint flags off', () => {
    expect(DEFAULT_SETTINGS.onboardingDone).toBe(false);
    expect(DEFAULT_SETTINGS.firstHintUsed).toEqual({
      identify: false,
      ear: false,
      progress: false,
    });
    expect(normalizeSettings({ difficulty: 'seventh', keyRoot: 'Bb' })).toEqual({
      difficulty: 'seventh',
      keyRoot: 'Bb',
      onboardingDone: false,
      firstHintUsed: { identify: false, ear: false, progress: false },
    });
  });

  it('persists onboardingDone and firstHintUsed', () => {
    const storage = new MemoryStorage();
    expect(saveSettings({
      ...DEFAULT_SETTINGS,
      onboardingDone: true,
      firstHintUsed: { identify: true, ear: false, progress: true },
    }, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual({
      difficulty: 'basic',
      keyRoot: 'C',
      onboardingDone: true,
      firstHintUsed: { identify: true, ear: false, progress: true },
    });
  });
});
