import { describe, it, expect, vi } from 'vitest';
import { PRODUCT_IDS } from '../lib/entitlement.js';
import {
  classifyStoreError,
  createIapClient,
  purchaseGate,
  storePriceString,
} from '../lib/iap.js';

describe('store price', () => {
  it('uses the StoreKit price string and never invents one', () => {
    expect(storePriceString({ priceString: 'HK$68.00', price: 68 })).toBe('HK$68.00');
    expect(storePriceString({ price: 9.99 })).toBeNull();
    expect(storePriceString(null)).toBeNull();
    expect(storePriceString({ priceString: '   ' })).toBeNull();
  });
});

describe('web storefront', () => {
  it('reports purchases unavailable and does not invent prices', async () => {
    const client = createIapClient({ isNative: () => false });
    const catalog = await client.loadProductPrices();
    expect(catalog.storeAvailable).toBe(false);
    expect(catalog.prices).toEqual({});
    expect(JSON.stringify(catalog)).not.toMatch(/9\.99|0\.99|4\.99/);

    const purchase = await client.purchase(PRODUCT_IDS.pro);
    expect(purchase).toEqual({
      ok: false,
      reason: 'unavailable',
      productId: PRODUCT_IDS.pro,
    });

    const restored = await client.restore();
    expect(restored.ok).toBe(false);
    expect(restored.reason).toBe('unavailable');

    const verified = await client.verifyProEntitlement();
    expect(verified).toMatchObject({ ok: true, isPro: false, source: 'unavailable' });
  });

  it('rejects unknown product ids', async () => {
    const client = createIapClient({ isNative: () => false });
    const result = await client.purchase('not.a.product');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_product');
  });
});

describe('native StoreKit path', () => {
  it('purchases Pro as a subscription and support as a consumable', async () => {
    const purchaseProduct = vi.fn().mockImplementation(async ({ productIdentifier }) => ({
      productIdentifier,
      transactionId: 'txn-1',
      isActive: true,
    }));
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { purchaseProduct },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });

    const pro = await client.purchase(PRODUCT_IDS.pro);
    expect(pro.ok).toBe(true);
    expect(pro.productId).toBe(PRODUCT_IDS.pro);
    expect(PRODUCT_IDS.pro).toMatch(/\.monthly$/);
    expect(purchaseProduct).toHaveBeenCalledWith({
      productIdentifier: PRODUCT_IDS.pro,
      productType: 'subs',
      isConsumable: false,
    });
    expect(purchaseProduct.mock.calls[0][0].quantity).toBeUndefined();

    const support = await client.purchase(PRODUCT_IDS.supportSmall);
    expect(support.ok).toBe(true);
    expect(purchaseProduct).toHaveBeenLastCalledWith({
      productIdentifier: PRODUCT_IDS.supportSmall,
      productType: 'inapp',
      quantity: 1,
      isConsumable: true,
    });
  });

  it('treats cancel and pending as non-unlocking outcomes', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          purchaseProduct: async () => {
            const error = new Error('User cancelled');
            error.code = 'USER_CANCELLED';
            throw error;
          },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    expect(await client.purchase(PRODUCT_IDS.pro)).toMatchObject({
      ok: false,
      reason: 'cancelled',
    });

    const pending = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          purchaseProduct: async () => {
            throw new Error('Transaction pending');
          },
        },
      }),
    });
    expect(await pending.purchase(PRODUCT_IDS.pro)).toMatchObject({
      ok: false,
      reason: 'pending',
    });
  });

  it('maps StoreKit price strings and leaves gaps when a product is missing', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async ({ productType }) => {
            if (productType === 'subs') {
              return {
                products: [
                  { identifier: PRODUCT_IDS.pro, priceString: 'HK$54.00', price: 54 },
                ],
              };
            }
            return {
              products: [
                { identifier: PRODUCT_IDS.supportSmall, price: 0.99 },
              ],
            };
          },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(catalog.prices[PRODUCT_IDS.pro]).toBe('HK$54.00');
    expect(catalog.prices[PRODUCT_IDS.supportSmall]).toBeUndefined();
    expect(catalog.subscriptionReady).toBe(true);
    expect(catalog.loadFailed).toBe(false);
    expect(catalog.missingProductIds).toEqual(expect.arrayContaining([
      PRODUCT_IDS.supportSmall,
      PRODUCT_IDS.supportLarge,
    ]));
    expect(JSON.stringify(catalog)).not.toMatch(/\$9\.99|\$0\.99|\$4\.99|\$6\.99/);
  });

  it('keeps Pro Monthly when the support catalog throws', async () => {
    const client = createIapClient({
      isNative: () => true,
      retryDelayMs: 0,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async ({ productType }) => {
            if (productType !== 'subs') throw new Error('support catalog unavailable');
            return {
              products: [{
                identifier: PRODUCT_IDS.pro,
                priceString: 'HK$54.00',
                title: 'Chord Trainer Pro Monthly',
              }],
            };
          },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(catalog.subscriptionReady).toBe(true);
    expect(catalog.loadFailed).toBe(false);
    expect(catalog.products[PRODUCT_IDS.pro].title).toBe('Chord Trainer Pro Monthly');
    expect(catalog.prices[PRODUCT_IDS.pro]).toBe('HK$54.00');
  });

  it('retries an empty subscription response and then records the price', async () => {
    let subsCalls = 0;
    const client = createIapClient({
      isNative: () => true,
      retryDelayMs: 0,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async ({ productType }) => {
            if (productType === 'subs') {
              subsCalls += 1;
              if (subsCalls === 1) return { products: [] };
              return {
                products: [{ identifier: PRODUCT_IDS.pro, priceString: 'HK$54.00', title: 'Pro Monthly' }],
              };
            }
            return { products: [] };
          },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(subsCalls).toBeGreaterThan(1);
    expect(catalog.subscriptionReady).toBe(true);
    expect(catalog.prices[PRODUCT_IDS.pro]).toBe('HK$54.00');
  });

  it('does not invent prices when StoreKit fails', async () => {
    const client = createIapClient({
      isNative: () => true,
      retryDelayMs: 0,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async () => { throw new Error('network'); },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(catalog.prices).toEqual({});
    expect(catalog.loadFailed).toBe(true);
    expect(catalog.subscriptionReady).toBe(false);
    expect(JSON.stringify(catalog)).not.toMatch(/9\.99|0\.99|4\.99/);
  });

  it('classifies a missing product separately from a generic failure', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          purchaseProduct: async () => {
            throw new Error('Cannot find product for id com.musiceducation.chordtrainer.pro.monthly');
          },
        },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    expect(await client.purchase(PRODUCT_IDS.pro)).toMatchObject({
      ok: false,
      reason: 'product_unavailable',
    });
    expect(classifyStoreError(new Error('The quantity is invalid'))).toBe('failed');
    expect(purchaseGate({ native: true, price: '', priceStatus: 'failed' })).toBe('needs_retry');
    expect(purchaseGate({ native: true, price: 'HK$54.00', priceStatus: 'ready' })).toBe('ready');
    expect(purchaseGate({ native: false, price: '', priceStatus: 'unavailable' })).toBe('unavailable');
  });

  it('verifies Pro from getPurchases and ignores support transactions', async () => {
    const getPurchases = vi.fn().mockResolvedValue({
      purchases: [
        { productIdentifier: PRODUCT_IDS.supportLarge },
        { productIdentifier: PRODUCT_IDS.pro },
      ],
    });
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { getPurchases },
        PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
      }),
    });
    const result = await client.verifyProEntitlement();
    expect(getPurchases).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.isPro).toBe(true);
    expect(result.source).toBe('storekit');
  });

  it('restores by syncing and then reading current purchases', async () => {
    const restorePurchases = vi.fn().mockResolvedValue(undefined);
    const getPurchases = vi.fn().mockResolvedValue({ purchases: [] });
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { restorePurchases, getPurchases },
      }),
    });
    const result = await client.restore();
    expect(restorePurchases).toHaveBeenCalled();
    expect(getPurchases).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, isPro: false });
  });

  it('keeps the cached hint when StoreKit verification throws', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          getPurchases: async () => { throw new Error('unavailable'); },
        },
      }),
    });
    const result = await client.verifyProEntitlement();
    expect(result.ok).toBe(false);
    expect(result.isPro).toBeNull();
  });
});
