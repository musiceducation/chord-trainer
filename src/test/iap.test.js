import { describe, it, expect } from 'vitest';
import {
  SUPPORT_PRODUCTS,
  SUPPORT_PRODUCT_IDS,
  createSupportStoreController,
  isCancelledPurchase,
  snapshotProducts,
} from '../lib/iap.js';

describe('iap', () => {
  it('defines the two US tip products', () => {
    expect(SUPPORT_PRODUCTS).toHaveLength(2);
    expect(SUPPORT_PRODUCTS.map((item) => item.fallbackPrice)).toEqual(['$0.99', '$4.99']);
    expect(SUPPORT_PRODUCT_IDS.every((id) => id.startsWith('com.musiceducation.chordtrainer.support.'))).toBe(true);
  });

  it('uses store prices when loaded and fallbacks otherwise', () => {
    expect(snapshotProducts()).toEqual([
      {
        id: SUPPORT_PRODUCTS[0].id,
        key: 'small',
        price: '$0.99',
        canPurchase: false,
        fromStore: false,
      },
      {
        id: SUPPORT_PRODUCTS[1].id,
        key: 'large',
        price: '$4.99',
        canPurchase: false,
        fromStore: false,
      },
    ]);

    const loaded = snapshotProducts((id) => (
      id === SUPPORT_PRODUCTS[0].id
        ? { pricing: { price: 'US$0.99' }, canPurchase: true }
        : null
    ));
    expect(loaded[0].price).toBe('US$0.99');
    expect(loaded[0].fromStore).toBe(true);
    expect(loaded[0].canPurchase).toBe(true);
    expect(loaded[1].price).toBe('$4.99');
  });

  it('treats payment-cancelled as a quiet cancel', () => {
    expect(isCancelledPurchase({ code: 6 }, 6)).toBe(true);
    expect(isCancelledPurchase({ code: 3 }, 6)).toBe(false);
    expect(isCancelledPurchase(null, 6)).toBe(false);
  });

  it('registers consumables, finishes approvals, and purchases', async () => {
    const calls = [];
    const products = {
      [SUPPORT_PRODUCTS[0].id]: {
        canPurchase: true,
        pricing: { price: '$0.99' },
        getOffer: () => ({
          order: async () => {
            calls.push('order');
            return undefined;
          },
        }),
      },
    };
    const store = {
      register: (items) => calls.push(['register', items.map((item) => item.type)]),
      when: () => ({
        approved: (cb) => {
          calls.push('approved-hook');
          cb({ finish: () => calls.push('finish') });
        },
      }),
      initialize: async (platforms) => { calls.push(['init', platforms]); },
      update: async () => { calls.push('update'); },
      get: (id) => products[id],
    };
    const controller = createSupportStoreController({
      loadPlugin: async () => ({
        store,
        ProductType: { CONSUMABLE: 'consumable' },
        Platform: { APPLE_APPSTORE: 'ios-appstore' },
        ErrorCode: { PAYMENT_CANCELLED: 6 },
      }),
    });

    const listed = await controller.loadProducts();
    expect(listed[0].fromStore).toBe(true);
    expect(await controller.purchase(SUPPORT_PRODUCTS[0].id)).toEqual({
      ok: true,
      cancelled: false,
      message: null,
    });
    expect(calls).toContain('finish');
    expect(calls).toContain('order');
  });

  it('returns cancelled when the user dismisses the sheet', async () => {
    const store = {
      register: () => {},
      when: () => ({ approved: () => {} }),
      initialize: async () => {},
      update: async () => {},
      get: () => ({
        getOffer: () => ({
          order: async () => ({ code: 6, message: 'cancelled' }),
        }),
      }),
    };
    const controller = createSupportStoreController({
      loadPlugin: async () => ({
        store,
        ProductType: { CONSUMABLE: 'consumable' },
        Platform: { APPLE_APPSTORE: 'ios-appstore' },
        ErrorCode: { PAYMENT_CANCELLED: 6 },
      }),
    });
    expect(await controller.purchase(SUPPORT_PRODUCTS[0].id)).toEqual({
      ok: false,
      cancelled: true,
      message: null,
    });
  });
});
