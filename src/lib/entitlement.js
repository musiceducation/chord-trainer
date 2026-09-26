import { nextDifficulty } from './difficultyRamp.js';

/** Must match App Store Connect and Products.storekit exactly. */
export const PRODUCT_IDS = Object.freeze({
  pro: 'com.musiceducation.chordtrainer.pro',
  supportSmall: 'com.musiceducation.chordtrainer.support.small',
  supportLarge: 'com.musiceducation.chordtrainer.support.large',
});

export const ALL_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.pro,
  PRODUCT_IDS.supportSmall,
  PRODUCT_IDS.supportLarge,
]);

export const SUPPORT_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.supportSmall,
  PRODUCT_IDS.supportLarge,
]);

export const FREE_DIFFICULTY = 'basic';
export const PRO_DIFFICULTIES = Object.freeze(['seventh', 'extended', 'all']);

/** localStorage hint only. StoreKit is the source of truth. */
export const PRO_HINT_KEY = 'chordTrainerProHint';

/**
 * Dev-only simulation. Off unless a non-production build sets this key.
 * Ignored on the native iOS storefront so it cannot ship as an unlock.
 */
export const DEV_PRO_KEY = 'chordTrainerDevPro';

export function isSupportProduct(productId) {
  return SUPPORT_PRODUCT_IDS.includes(productId);
}

/** Support consumables never unlock features. Only the Pro non-consumable does. */
export function accessGrantedByProduct(productId) {
  return productId === PRODUCT_IDS.pro ? 'pro' : null;
}

export function difficultyAllowed(isPro, difficulty) {
  if (difficulty === FREE_DIFFICULTY) return true;
  return Boolean(isPro) && PRO_DIFFICULTIES.includes(difficulty);
}

export function clampDifficulty(isPro, difficulty) {
  return difficultyAllowed(isPro, difficulty) ? difficulty : FREE_DIFFICULTY;
}

export function canAccessProgression(isPro) {
  return Boolean(isPro);
}

export function canAccessFullStats(isPro) {
  return Boolean(isPro);
}

function productIdOf(purchase) {
  if (!purchase || typeof purchase !== 'object') return '';
  return purchase.productIdentifier || purchase.productId || purchase.identifier || '';
}

/** A verified, non-revoked Pro transaction. Pending and support purchases do not count. */
export function isActiveProTransaction(purchase) {
  if (productIdOf(purchase) !== PRODUCT_IDS.pro) return false;
  if (purchase.revocationDate) return false;
  if (purchase.purchaseState === '0' || purchase.purchaseState === 0) return false;
  if (purchase.isPending === true || purchase.pending === true) return false;
  return true;
}

export function entitlementFromPurchases(purchases) {
  const list = Array.isArray(purchases) ? purchases : [];
  return list.some(isActiveProTransaction);
}

/**
 * Successful support purchases leave entitlement unchanged.
 * A revoked or pending Pro transaction does not grant access.
 */
export function entitlementAfterPurchase(result, previousIsPro = false) {
  if (!result?.ok) return Boolean(previousIsPro);
  if (result.reason === 'pending' || result.pending) return Boolean(previousIsPro);
  if (result.revoked) return Boolean(previousIsPro);
  if (accessGrantedByProduct(result.productId) === 'pro') return true;
  return Boolean(previousIsPro);
}

/**
 * Cap a free player at Triads. `nudge` is true only when the ramp would have
 * left Triads, so the UI can offer a soft Pro hint without changing level.
 */
export function applyFreeRampCap({
  isPro = false,
  current,
  cleanStreak = 0,
  missStreak = 0,
} = {}) {
  const proposed = nextDifficulty({ current, cleanStreak, missStreak });
  if (isPro) return { difficulty: proposed, nudge: false };
  const nudge = current === FREE_DIFFICULTY && proposed !== FREE_DIFFICULTY;
  return { difficulty: clampDifficulty(false, proposed), nudge };
}

export function readProHint(storage) {
  if (!storage) return false;
  try {
    return storage.getItem(PRO_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeProHint(isPro, storage) {
  if (!storage) return false;
  try {
    if (isPro) storage.setItem(PRO_HINT_KEY, '1');
    else storage.removeItem(PRO_HINT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isDevProSimulation(storage, { dev = false, native = false } = {}) {
  if (!dev || native) return false;
  if (!storage) return false;
  try {
    return storage.getItem(DEV_PRO_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Cache is a hint on iOS until StoreKit answers. A successful check replaces it.
 * Web never unlocks from the hint. The dev flag is the only non-iOS bypass.
 */
export function resolveEntitlement({
  hint = false,
  verified = null,
  verifyOk = false,
  devPro = false,
  native = false,
} = {}) {
  if (devPro) return true;
  if (!native) return false;
  if (verifyOk) return Boolean(verified);
  return Boolean(hint);
}
