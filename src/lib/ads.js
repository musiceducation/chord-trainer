/**
 * Banner gate for AdMob lock A.
 * Practice rounds and sounding piano audio hide the banner immediately.
 * Pro and App Store screenshot captures never show it.
 */

/** Google's public iOS demo IDs. Safe to commit. Never use these in Release. */
export const GOOGLE_TEST_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
export const GOOGLE_TEST_IOS_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';

const GOOGLE_TEST_PUBLISHER = '3940256099942544';

/** Tabs whose visible screen is a practice round as soon as you enter them. */
export const PRACTICE_ROUND_TABS = Object.freeze([
  'test',
  'ear',
  'listen',
  'progression',
  'abrsm',
]);

export function isPracticeRoundTab(tab) {
  return PRACTICE_ROUND_TABS.includes(tab);
}

/**
 * @param {{
 *   isPro?: boolean,
 *   isAdFree?: boolean,
 *   tab?: string,
 *   inPracticeRound?: boolean,
 *   audioPlaying?: boolean,
 *   settingsOpen?: boolean,
 *   paywallOpen?: boolean,
 *   suppress?: boolean,
 * }} input
 * @returns {boolean}
 */
export function shouldShowBanner({
  isPro = false,
  isAdFree = false,
  tab = '',
  inPracticeRound = false,
  audioPlaying = false,
  settingsOpen = false,
  paywallOpen = false,
  suppress = false,
} = {}) {
  if (suppress || isPro || isAdFree || audioPlaying) return false;
  // The paywall covers the round. Its outer chrome is a non-practice surface.
  if (paywallOpen) return true;
  // Opening Settings over Identify / Train / Listen / Roman / ABRSM does not
  // leave the round. Re-show only after the round is gone and audio has stopped.
  if (inPracticeRound) return false;
  if (settingsOpen || tab === 'stats' || tab === 'lookup') return true;
  // Home / mode gate: a practice tab before a round has started.
  if (isPracticeRoundTab(tab)) return true;
  return false;
}

/**
 * Debug always requests Google's iOS test banner unit.
 * Release uses the unit injected from xcconfig. Empty or test IDs are refused
 * so a Release build cannot ship demo ads.
 */
export function resolveBannerAdUnit({ debug = false, bannerAdUnitId = '' } = {}) {
  if (debug) return GOOGLE_TEST_IOS_BANNER_ID;
  const id = String(bannerAdUnitId || '').trim();
  if (!id || id.includes(GOOGLE_TEST_PUBLISHER)) return '';
  return id;
}
