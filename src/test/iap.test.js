import { describe, it, expect, vi } from 'vitest';
import { PRODUCT_IDS } from '../lib/entitlement.js';
import {
  createIapClient,
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
  it('purchases Pro as a non-consumable and support as a consumable', async () => {
    const purchaseProduct = vi.fn().mockImplementation(async ({ productIdentifier }) => ({
      productIdentifier,
      transactionId: 'txn-1',
    }));
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { purchaseProduct },
        PURCHASE_TYPE: { INAPP: 'inapp' },
      }),
    });

    const pro = await client.purchase(PRODUCT_IDS.pro);
    expect(pro.ok).toBe(true);
    expect(pro.productId).toBe(PRODUCT_IDS.pro);
    expect(purchaseProduct).toHaveBeenCalledWith({
      productIdentifier: PRODUCT_IDS.pro,
      productType: 'inapp',
      quantity: 1,
      isConsumable: false,
    });

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
        PURCHASE_TYPE: { INAPP: 'inapp' },
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
          getProducts: async () => ({
            products: [
              { identifier: PRODUCT_IDS.pro, priceString: 'HK$78.00', price: 78 },
              { identifier: PRODUCT_IDS.supportSmall, price: 0.99 },
            ],
          }),
        },
        PURCHASE_TYPE: { INAPP: 'inapp' },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(catalog.prices[PRODUCT_IDS.pro]).toBe('HK$78.00');
    expect(catalog.prices[PRODUCT_IDS.supportSmall]).toBeUndefined();
    expect(catalog.loadFailed).toBe(true);
    expect(JSON.stringify(catalog)).not.toMatch(/\$9\.99|\$0\.99|\$4\.99/);
  });

  it('does not invent prices when StoreKit fails', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async () => { throw new Error('network'); },
        },
      }),
    });
    const catalog = await client.loadProductPrices();
    expect(catalog.prices).toEqual({});
    expect(catalog.loadFailed).toBe(true);
    expect(JSON.stringify(catalog)).not.toMatch(/9\.99|0\.99|4\.99/);
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
        PURCHASE_TYPE: { INAPP: 'inapp' },
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
