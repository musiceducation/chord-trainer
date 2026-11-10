import { describe, expect, it } from 'vitest';
import {
  GOOGLE_TEST_IOS_BANNER_ID,
  isPracticeRoundTab,
  resolveBannerAdUnit,
  shouldShowBanner,
} from '../lib/ads.js';

const practiceTabs = ['test', 'ear', 'listen', 'progression', 'abrsm'];

describe('shouldShowBanner', () => {
  it('shows for a non-Pro learner on a non-practice surface', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: false,
    })).toBe(true);
    expect(shouldShowBanner({
      isPro: false,
      tab: 'lookup',
      inPracticeRound: false,
      audioPlaying: false,
    })).toBe(true);
    expect(shouldShowBanner({
      isPro: false,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: false,
      settingsOpen: true,
    })).toBe(true);
  });

  it('shows on the mode gate before a round starts', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'test',
      inPracticeRound: false,
      audioPlaying: false,
    })).toBe(true);
  });

  it('hides during a practice round', () => {
    for (const tab of practiceTabs) {
      expect(isPracticeRoundTab(tab)).toBe(true);
      expect(shouldShowBanner({
        isPro: false,
        tab,
        inPracticeRound: true,
        audioPlaying: false,
      })).toBe(false);
    }
  });

  it('hides while audio is playing, including Lookup and an open Settings panel', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'lookup',
      inPracticeRound: false,
      audioPlaying: true,
    })).toBe(false);
    expect(shouldShowBanner({
      isPro: false,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: true,
      settingsOpen: true,
    })).toBe(false);
  });

  it('hides for a one-time Ad-free purchase even when the old subscription is inactive', () => {
    expect(shouldShowBanner({
      isPro: false,
      isAdFree: true,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: false,
    })).toBe(false);
  });

  it('hides for Pro on every surface', () => {
    expect(shouldShowBanner({
      isPro: true,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: false,
      settingsOpen: true,
      paywallOpen: true,
    })).toBe(false);
    expect(shouldShowBanner({
      isPro: true,
      tab: 'test',
      inPracticeRound: true,
      audioPlaying: true,
    })).toBe(false);
  });

  it('keeps the banner hidden when Settings opens over a practice round', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'test',
      inPracticeRound: true,
      audioPlaying: false,
      settingsOpen: true,
    })).toBe(false);
  });

  it('shows on the paywall outer chrome once audio has stopped', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'test',
      inPracticeRound: true,
      audioPlaying: false,
      paywallOpen: true,
    })).toBe(true);
    expect(shouldShowBanner({
      isPro: false,
      tab: 'test',
      inPracticeRound: true,
      audioPlaying: true,
      paywallOpen: true,
    })).toBe(false);
  });

  it('stays hidden for App Store screenshot captures', () => {
    expect(shouldShowBanner({
      isPro: false,
      tab: 'stats',
      inPracticeRound: false,
      audioPlaying: false,
      settingsOpen: true,
      suppress: true,
    })).toBe(false);
  });
});

describe('resolveBannerAdUnit', () => {
  it('uses the official iOS test banner in debug', () => {
    expect(resolveBannerAdUnit({
      debug: true,
      bannerAdUnitId: 'ca-app-pub-0000000000000000/0000000000',
    })).toBe(GOOGLE_TEST_IOS_BANNER_ID);
  });

  it('refuses an empty or test unit in release', () => {
    expect(resolveBannerAdUnit({ debug: false, bannerAdUnitId: '' })).toBe('');
    expect(resolveBannerAdUnit({
      debug: false,
      bannerAdUnitId: GOOGLE_TEST_IOS_BANNER_ID,
    })).toBe('');
  });

  it('keeps a non-test unit supplied by the release build', () => {
    const unit = 'unit-from-xcconfig';
    expect(resolveBannerAdUnit({ debug: false, bannerAdUnitId: unit })).toBe(unit);
  });
});
