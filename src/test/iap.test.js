import { describe, it, expect, vi } from 'vitest';
import {
  TIP_PRODUCT_IDS,
  TIP_PRODUCT_ID_LIST,
  TIP_TIERS,
  TIP_COPY,
  createIapClient,
} from '../lib/iap.js';

describe('tip jar IAP constants', () => {
  it('exports the exact App Store product IDs', () => {
    expect(TIP_PRODUCT_IDS.lemonTea).toBe('com.musiceducation.chordtrainer.tip.lemontea');
    expect(TIP_PRODUCT_IDS.coffee).toBe('com.musiceducation.chordtrainer.tip.coffee');
    expect(TIP_PRODUCT_ID_LIST).toEqual([
      'com.musiceducation.chordtrainer.tip.lemontea',
      'com.musiceducation.chordtrainer.tip.coffee',
    ]);
  });

  it('uses the finalized Traditional Chinese copy', () => {
    expect(TIP_COPY.title).toBe('支持一下');
    expect(TIP_COPY.restore).toBe('恢復購買');
    expect(TIP_COPY.thankYou).toBe('唔該晒');
    expect(TIP_TIERS[0].label).toBe('請飲杯凍檸茶');
    expect(TIP_TIERS[0].fallbackPrice).toBe('$0.99');
    expect(TIP_TIERS[1].label).toBe('請飲杯啡');
    expect(TIP_TIERS[1].fallbackPrice).toBe('$4.99');
  });
});

describe('web/dev mock storefront', () => {
  it('loads fallback prices and mocks a successful purchase', async () => {
    const client = createIapClient({
      isNative: () => false,
      wait: async () => {},
    });
    const products = await client.loadTipProducts();
    expect(products[0].priceString).toBe('$0.99');
    expect(products[1].priceString).toBe('$4.99');

    const result = await client.purchaseTip(TIP_PRODUCT_IDS.lemonTea);
    expect(result).toEqual({
      ok: true,
      mocked: true,
      productId: TIP_PRODUCT_IDS.lemonTea,
    });
  });

  it('rejects unknown product IDs', async () => {
    const client = createIapClient({ isNative: () => false, wait: async () => {} });
    const result = await client.purchaseTip('not.a.real.product');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_product');
  });

  it('restore explains that tips are consumable', async () => {
    const client = createIapClient({ isNative: () => false });
    const result = await client.restoreTips();
    expect(result.ok).toBe(true);
    expect(result.consumable).toBe(true);
    expect(result.restored).toBe(false);
    expect(result.message).toBe(TIP_COPY.restoreNothing);
  });
});

describe('native StoreKit path', () => {
  it('purchases a consumable via NativePurchases', async () => {
    const purchaseProduct = vi.fn().mockResolvedValue({ transactionId: 'txn-1' });
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { purchaseProduct },
        PURCHASE_TYPE: { INAPP: 'inapp' },
      }),
    });

    const result = await client.purchaseTip(TIP_PRODUCT_IDS.coffee);
    expect(result.ok).toBe(true);
    expect(result.mocked).toBe(false);
    expect(purchaseProduct).toHaveBeenCalledWith({
      productIdentifier: TIP_PRODUCT_IDS.coffee,
      productType: 'inapp',
      quantity: 1,
      isConsumable: true,
    });
  });

  it('treats user cancellation as a non-success without failing loudly', async () => {
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
    const result = await client.purchaseTip(TIP_PRODUCT_IDS.lemonTea);
    expect(result).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('maps StoreKit prices onto the zh-Hant tier labels', async () => {
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: {
          isBillingSupported: async () => ({ isBillingSupported: true }),
          getProducts: async () => ({
            products: [{
              identifier: TIP_PRODUCT_IDS.coffee,
              priceString: 'HK$38.00',
              title: 'Coffee',
            }],
          }),
        },
        PURCHASE_TYPE: { INAPP: 'inapp' },
      }),
    });
    const products = await client.loadTipProducts();
    expect(products[0].label).toBe('請飲杯凍檸茶');
    expect(products[0].priceString).toBe('$0.99');
    expect(products[1].label).toBe('請飲杯啡');
    expect(products[1].priceString).toBe('HK$38.00');
  });

  it('restore still reports nothing to restore for consumable tips', async () => {
    const restorePurchases = vi.fn().mockResolvedValue(undefined);
    const client = createIapClient({
      isNative: () => true,
      getNativePurchases: async () => ({
        NativePurchases: { restorePurchases },
      }),
    });
    const result = await client.restoreTips();
    expect(restorePurchases).toHaveBeenCalled();
    expect(result.consumable).toBe(true);
    expect(result.message).toBe(TIP_COPY.restoreNothing);
  });
});
