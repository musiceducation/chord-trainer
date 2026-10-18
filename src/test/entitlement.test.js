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
  it('allows every difficulty tier without Pro; Pro still gates progressions and full stats', () => {
    expect(difficultyAllowed(false, 'basic')).toBe(true);
    expect(difficultyAllowed(false, 'seventh')).toBe(true);
    expect(difficultyAllowed(false, 'extended')).toBe(true);
    expect(difficultyAllowed(false, 'all')).toBe(true);
    expect(clampDifficulty(false, 'seventh')).toBe('seventh');
    expect(canAccessProgression(false)).toBe(false);
    expect(canAccessFullStats(false)).toBe(false);

    expect(difficultyAllowed(true, 'extended')).toBe(true);
    expect(clampDifficulty(true, 'extended')).toBe('extended');
    expect(canAccessProgression(true)).toBe(true);
    expect(canAccessFullStats(true)).toBe(true);
  });

  it('ramps difficulty for every player and never nudges a Pro paywall for tiers', () => {
    expect(applyFreeRampCap({
      isPro: false,
      current: 'basic',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'seventh', nudge: false });

    expect(applyFreeRampCap({
      isPro: false,
      current: 'basic',
      cleanStreak: 0,
      missStreak: RAMP_MISS_STREAK,
    })).toEqual({ difficulty: 'basic', nudge: false });

    expect(applyFreeRampCap({
      isPro: true,
      current: 'seventh',
      cleanStreak: RAMP_CLEAN_STREAK,
      missStreak: 0,
    })).toEqual({ difficulty: 'extended', nudge: false });
  });

  it('keeps a free player on their current tier when the ramp does not promote', () => {
    expect(applyFreeRampCap({
      isPro: false,
      current: 'extended',
      cleanStreak: 0,
      missStreak: 0,
    })).toEqual({ difficulty: 'extended', nudge: false });
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

describe('subscription and legacy Pro entitlements', () => {
  it('treats an active monthly subscription as Pro', () => {
    expect(entitlementFromPurchases([{
      productIdentifier: PRODUCT_IDS.pro,
      isActive: true,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }])).toBe(true);
  });

  it('rejects an expired monthly subscription', () => {
    expect(entitlementFromPurchases([{
      productIdentifier: PRODUCT_IDS.pro,
      isActive: false,
      subscriptionState: 'expired',
      expirationDate: new Date(Date.now() - 1000).toISOString(),
    }])).toBe(false);
  });

  it('still honors the legacy Non-Consumable Pro purchase', () => {
    expect(entitlementFromPurchases([{
      productIdentifier: PRODUCT_IDS.proLegacy,
    }])).toBe(true);
  });
});
