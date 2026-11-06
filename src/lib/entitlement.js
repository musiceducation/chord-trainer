import { nextDifficulty } from './difficultyRamp.js';

/**
 * Must match App Store Connect and Products.storekit exactly.
 *
 * - `adFree` — non-consumable sold to new buyers. Removes ads. USD 4.99.
 *   Kenneth still has to create this product in App Store Connect.
 * - `pro` — auto-renewable monthly. Not offered to new buyers. Existing
 *   subscribers stay ad-free while the subscription is active.
 * - `proLegacy` — former Non-Consumable Pro. Still honored. Not sold.
 * - `supportSmall` — consumable USD 0.99. Unlocks nothing.
 * - `supportLarge` — consumable USD 4.99. Hidden. Not the Ad-free unlock,
 *   because a consumable cannot be restored as a one-time purchase.
 */
export const PRODUCT_IDS = Object.freeze({
  adFree: 'com.musiceducation.chordtrainer.adfree',
  pro: 'com.musiceducation.chordtrainer.pro.monthly',
  proLegacy: 'com.musiceducation.chordtrainer.pro',
  supportSmall: 'com.musiceducation.chordtrainer.support.small',
  supportLarge: 'com.musiceducation.chordtrainer.support.large',
});

/** SKUs shown / purchased as Pro (monthly). */
export const PRO_SUBSCRIPTION_IDS = Object.freeze([PRODUCT_IDS.pro]);

/** Any product id that can grant Pro access (subscription or legacy NC). */
export const PRO_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.pro,
  PRODUCT_IDS.proLegacy,
]);

export const ALL_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.adFree,
  PRODUCT_IDS.pro,
  PRODUCT_IDS.supportSmall,
  PRODUCT_IDS.supportLarge,
]);

/** Shown in Settings / the paywall. Monthly Pro and the $4.99 tip are not. */
export const OFFERED_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.adFree,
  PRODUCT_IDS.supportSmall,
]);

export const SUPPORT_PRODUCT_IDS = Object.freeze([
  PRODUCT_IDS.supportSmall,
  PRODUCT_IDS.supportLarge,
]);

export const FREE_DIFFICULTY = 'basic';
/** @deprecated Difficulty tiers are free. Kept for older tests/docs. */
export const PRO_DIFFICULTIES = Object.freeze([]);
export const ALL_DIFFICULTIES = Object.freeze(['basic', 'seventh', 'extended', 'all']);

/** localStorage hint only. StoreKit is the source of truth. */
export const PRO_HINT_KEY = 'chordTrainerProHint';
/** Lifetime Ad-free purchase hint. Separate from an active subscription. */
export const AD_FREE_HINT_KEY = 'chordTrainerAdFreeHint';

/**
 * Dev-only simulation. Off unless a non-production build sets this key.
 * Ignored on the native iOS storefront so it cannot ship as an unlock.
 */
export const DEV_PRO_KEY = 'chordTrainerDevPro';

export function isSupportProduct(productId) {
  return SUPPORT_PRODUCT_IDS.includes(productId);
}

export function isProProduct(productId) {
  return PRO_PRODUCT_IDS.includes(productId);
}

export function isProSubscriptionProduct(productId) {
  return PRO_SUBSCRIPTION_IDS.includes(productId);
}

export function isAdFreeProduct(productId) {
  return productId === PRODUCT_IDS.adFree;
}

/**
 * Support consumables unlock nothing.
 * The lifetime Ad-free SKU removes ads only.
 * Monthly Pro and the legacy non-consumable still count as Pro (ad-free).
 */
export function accessGrantedByProduct(productId) {
  if (isAdFreeProduct(productId)) return 'adfree';
  return isProProduct(productId) ? 'pro' : null;
}

/** All practice difficulty tiers are free. `isPro` is ignored (kept for call-site compatibility). */
export function difficultyAllowed(_isPro, difficulty) {
  return ALL_DIFFICULTIES.includes(difficulty);
}

export function clampDifficulty(_isPro, difficulty) {
  return difficultyAllowed(false, difficulty) ? difficulty : FREE_DIFFICULTY;
}

/** Every mode is free. `isPro` is ignored. */
export function canAccessProgression(_isPro) {
  return true;
}

/** Full stats are free. `isPro` is ignored. */
export function canAccessFullStats(_isPro) {
  return true;
}

function productIdOf(purchase) {
  if (!purchase || typeof purchase !== 'object') return '';
  return purchase.productIdentifier || purchase.productId || purchase.identifier || '';
}

function expirationMs(purchase) {
  const raw = purchase?.expirationDate;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * A verified, non-revoked Pro entitlement.
 * - Legacy Non-Consumable: lifetime unless revoked/pending.
 * - Monthly subscription: requires active / unexpired StoreKit state.
 */
export function isActiveProTransaction(purchase, now = Date.now()) {
  const id = productIdOf(purchase);
  if (!isProProduct(id)) return false;
  if (purchase.revocationDate) return false;
  if (purchase.purchaseState === '0' || purchase.purchaseState === 0) return false;
  if (purchase.isPending === true || purchase.pending === true) return false;

  if (isProSubscriptionProduct(id)) {
    if (purchase.isActive === false) return false;
    const state = purchase.subscriptionState;
    if (state === 'expired' || state === 'revoked') return false;
    const exp = expirationMs(purchase);
    if (exp != null && exp <= now) return false;
    // Missing isActive/expiration: treat as active (StoreKit 1 / incomplete mocks).
    return true;
  }

  // Legacy one-time unlock.
  return true;
}

function isActiveLifetimeTransaction(purchase) {
  const id = productIdOf(purchase);
  if (!isAdFreeProduct(id)) return false;
  if (purchase.revocationDate) return false;
  if (purchase.purchaseState === '0' || purchase.purchaseState === 0) return false;
  if (purchase.isPending === true || purchase.pending === true) return false;
  return true;
}

export function entitlementFromPurchases(purchases, now = Date.now()) {
  const list = Array.isArray(purchases) ? purchases : [];
  return list.some((p) => isActiveProTransaction(p, now));
}

/**
 * Ad-free is an active monthly/legacy Pro entitlement or the $4.99
 * non-consumable. Support purchases never qualify.
 */
export function entitlementFlagsFromPurchases(purchases, now = Date.now()) {
  const list = Array.isArray(purchases) ? purchases : [];
  const isPro = list.some((p) => isActiveProTransaction(p, now));
  const hasLifetimeAdFree = list.some((p) => isActiveLifetimeTransaction(p));
  return {
    isPro,
    hasLifetimeAdFree,
    isAdFree: isPro || hasLifetimeAdFree,
  };
}

/**
 * Successful support purchases leave entitlement unchanged.
 * A revoked or pending Pro transaction does not grant access.
 */
export function entitlementAfterPurchase(result, previousIsPro = false) {
  if (!result?.ok) return Boolean(previousIsPro);
  if (result.reason === 'pending' || result.pending) return Boolean(previousIsPro);
  if (result.revoked) return Boolean(previousIsPro);
  if (accessGrantedByProduct(result.productId) === 'adfree') return Boolean(previousIsPro);
  if (accessGrantedByProduct(result.productId) === 'pro') {
    // Prefer live subscription flag when present.
    if (result.transaction && isProSubscriptionProduct(result.productId)) {
      return isActiveProTransaction(result.transaction);
    }
    return true;
  }
  return Boolean(previousIsPro);
}

/** Lifetime purchase, or any outcome that leaves an existing ad-free state. */
export function adFreeAfterPurchase(result, previousIsAdFree = false) {
  if (!result?.ok || result.reason === 'pending' || result.pending || result.revoked) {
    return Boolean(previousIsAdFree);
  }
  const granted = accessGrantedByProduct(result.productId);
  if (granted === 'adfree') return true;
  if (granted === 'pro') return entitlementAfterPurchase(result, false) || Boolean(previousIsAdFree);
  return Boolean(previousIsAdFree);
}

/**
 * Auto-ramp across all difficulties for every player.
 * Difficulty is free; `nudge` is always false (Pro no longer gates tiers).
 */
export function applyFreeRampCap({
  isPro: _isPro = false,
  current,
  cleanStreak = 0,
  missStreak = 0,
} = {}) {
  const proposed = nextDifficulty({ current, cleanStreak, missStreak });
  return { difficulty: proposed, nudge: false };
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

export function readAdFreeHint(storage) {
  if (!storage) return false;
  try {
    return storage.getItem(AD_FREE_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAdFreeHint(isAdFree, storage) {
  if (!storage) return false;
  try {
    if (isAdFree) storage.setItem(AD_FREE_HINT_KEY, '1');
    else storage.removeItem(AD_FREE_HINT_KEY);
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
