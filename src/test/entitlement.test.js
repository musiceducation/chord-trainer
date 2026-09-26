import { describe, it, expect } from 'vitest';
import { RAMP_CLEAN_STREAK, RAMP_MISS_STREAK } from '../lib/difficultyRamp.js';
import {
  PRODUCT_IDS,
  FREE_DIFFICULTY,
  PRO_HINT_KEY,
  DEV_PRO_KEY,
  accessGrantedByProduct,
  difficultyAllowed,
  clampDifficulty,
  canAccessProgression,
  canAccessFullStats,
  entitlementFromPurchases,
  entitlementAfterPurchase,
  applyFreeRampCap,
  readProHint,
  writeProHint,
  isDevProSimulation,
  resolveEntitlement,
} from '../lib/entitlement.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

describe('free vs Pro gating', () => {
  it('keeps free play on Triads and unlocks the rest for Pro', () => {
    expect(difficultyAllowed(false, 'basic')).toBe(true);
    expect(difficultyAllowed(false, 'seventh')).toBe(false);
    expect(difficultyAllowed(false, 'extended')).toBe(false);
    expect(difficultyAllowed(false, 'all')).toBe(false);
    expect(clampDifficulty(false, 'seventh')).toBe(FREE_DIFFICULTY);
    expect(canAccessProgression(false)).toBe(false);
    expect(canAccessFullStats(false)).toBe(false);

    expect(difficultyAllowed(true, 'seventh')).toBe(true);
    expect(difficultyAllowed(true, 'extended')).toBe(true);
    expect(difficultyAllowed(true, 'all')).toBe(true);
    expect(clampDifficulty(true, 'extended')).toBe('extended');
    expect(canAccessProgression(true)).toBe(true);
    expect(canAccessFullStats(true)).toBe(true);
  });

  it('caps a free ramp at Triads and nudges when a promotion would fire', () => {
    expect(applyFreeRampCap({
      isPro: false,
      current: 'basic',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'basic', nudge: true });

    expect(applyFreeRampCap({
      isPro: false,
      current: 'basic',
      cleanStreak: 0,
      missStreak: RAMP_MISS_STREAK,
    })).toEqual({ difficulty: 'basic', nudge: false });

    expect(applyFreeRampCap({
      isPro: true,
      current: 'basic',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'seventh', nudge: false });

    expect(applyFreeRampCap({
      isPro: true,
      current: 'seventh',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'extended', nudge: false });
  });

  it('does not let a stale Pro level stay selected for a free player', () => {
    expect(applyFreeRampCap({
      isPro: false,
      current: 'extended',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'basic', nudge: false });
  });
});

describe('support purchases grant nothing', () => {
  it('only the Pro product id grants access', () => {
    expect(accessGrantedByProduct(PRODUCT_IDS.pro)).toBe('pro');
    expect(accessGrantedByProduct(PRODUCT_IDS.supportSmall)).toBeNull();
    expect(accessGrantedByProduct(PRODUCT_IDS.supportLarge)).toBeNull();
    expect(entitlementAfterPurchase({
      ok: true,
      productId: PRODUCT_IDS.supportSmall,
    }, false)).toBe(false);
    expect(entitlementAfterPurchase({
      ok: true,
      productId: PRODUCT_IDS.supportLarge,
    }, true)).toBe(true);
    expect(entitlementAfterPurchase({
      ok: true,
      productId: PRODUCT_IDS.pro,
    }, false)).toBe(true);
    expect(entitlementAfterPurchase({
      ok: false,
      reason: 'cancelled',
      productId: PRODUCT_IDS.pro,
    }, false)).toBe(false);
    expect(entitlementAfterPurchase({
      ok: false,
      reason: 'pending',
      productId: PRODUCT_IDS.pro,
    }, false)).toBe(false);
    expect(entitlementAfterPurchase({
      ok: true,
      productId: PRODUCT_IDS.pro,
      revoked: true,
    }, false)).toBe(false);
  });

  it('ignores support transactions and revoked or pending Pro transactions', () => {
    expect(entitlementFromPurchases([
      { productIdentifier: PRODUCT_IDS.supportSmall },
      { productIdentifier: PRODUCT_IDS.supportLarge },
    ])).toBe(false);
    expect(entitlementFromPurchases([
      { productIdentifier: PRODUCT_IDS.pro, revocationDate: '2026-01-01T00:00:00Z' },
    ])).toBe(false);
    expect(entitlementFromPurchases([
      { productIdentifier: PRODUCT_IDS.pro, purchaseState: '0' },
    ])).toBe(false);
    expect(entitlementFromPurchases([
      { productIdentifier: PRODUCT_IDS.supportLarge },
      { productIdentifier: PRODUCT_IDS.pro },
    ])).toBe(true);
  });
});

describe('entitlement cache', () => {
  it('treats localStorage as a hint and re-checks StoreKit', () => {
    const storage = new MemoryStorage();
    expect(readProHint(storage)).toBe(false);
    expect(writeProHint(true, storage)).toBe(true);
    expect(storage.getItem(PRO_HINT_KEY)).toBe('1');
    expect(readProHint(storage)).toBe(true);

    expect(resolveEntitlement({
      hint: true,
      native: true,
      verifyOk: false,
    })).toBe(true);
    expect(resolveEntitlement({
      hint: true,
      native: true,
      verified: false,
      verifyOk: true,
    })).toBe(false);
    expect(resolveEntitlement({
      hint: false,
      native: true,
      verified: true,
      verifyOk: true,
    })).toBe(true);
    expect(resolveEntitlement({
      hint: true,
      native: false,
      verifyOk: true,
      verified: false,
    })).toBe(false);

    writeProHint(false, storage);
    expect(readProHint(storage)).toBe(false);
  });

  it('enables the dev Pro flag only in non-production, non-native builds', () => {
    const storage = new MemoryStorage();
    expect(isDevProSimulation(storage, { dev: true, native: false })).toBe(false);
    storage.setItem(DEV_PRO_KEY, '1');
    expect(isDevProSimulation(storage, { dev: false, native: false })).toBe(false);
    expect(isDevProSimulation(storage, { dev: true, native: true })).toBe(false);
    expect(isDevProSimulation(storage, { dev: true, native: false })).toBe(true);
    expect(resolveEntitlement({ devPro: true, native: false })).toBe(true);
  });
});
