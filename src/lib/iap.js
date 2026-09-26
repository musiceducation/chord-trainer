import { Capacitor } from '@capacitor/core';
import {
  ALL_PRODUCT_IDS,
  PRODUCT_IDS,
  entitlementFromPurchases,
  isSupportProduct,
} from './entitlement.js';

const INAPP = 'inapp';

function defaultIsNative() {
  return Capacitor.isNativePlatform();
}

async function defaultGetNativePurchases() {
  return import('@capgo/native-purchases');
}

export function isUserCancelled(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return (
    code === 'USER_CANCELLED'
    || code === 'PURCHASE_CANCELLED'
    || code === '1'
    || message.includes('cancel')
  );
}

export function isPurchasePending(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  const code = String(error?.code ?? '').toLowerCase();
  return code.includes('pending') || message.includes('pending');
}

/** StoreKit localized price only. Never synthesize a price from a number. */
export function storePriceString(product) {
  const value = product?.priceString;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function classifyPurchaseError(error) {
  if (isUserCancelled(error)) return 'cancelled';
  if (isPurchasePending(error)) return 'pending';
  return 'failed';
}

/**
 * StoreKit client. Inject dependencies in tests. Web/dev has no store:
 * purchases report unavailable instead of a simulated charge.
 */
export function createIapClient(deps = {}) {
  const {
    isNative = defaultIsNative,
    getNativePurchases = defaultGetNativePurchases,
  } = deps;

  async function nativeModule() {
    const mod = await getNativePurchases();
    const NativePurchases = mod.NativePurchases;
    const productType = mod.PURCHASE_TYPE?.INAPP || INAPP;
    return { NativePurchases, productType };
  }

  async function loadProductPrices() {
    if (!isNative()) {
      return { storeAvailable: false, loadFailed: false, prices: {} };
    }

    try {
      const { NativePurchases, productType } = await nativeModule();
      const billing = await NativePurchases.isBillingSupported?.();
      if (billing && billing.isBillingSupported === false) {
        return { storeAvailable: false, loadFailed: true, prices: {} };
      }
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: [...ALL_PRODUCT_IDS],
        productType,
      });
      const prices = {};
      (products || []).forEach((product) => {
        const price = storePriceString(product);
        if (product?.identifier && price) prices[product.identifier] = price;
      });
      const loadFailed = ALL_PRODUCT_IDS.some((id) => !prices[id]);
      return { storeAvailable: true, loadFailed, prices };
    } catch {
      return { storeAvailable: true, loadFailed: true, prices: {} };
    }
  }

  async function purchase(productId) {
    if (!ALL_PRODUCT_IDS.includes(productId)) {
      return { ok: false, reason: 'unknown_product', productId };
    }
    if (!isNative()) {
      return { ok: false, reason: 'unavailable', productId };
    }

    try {
      const { NativePurchases, productType } = await nativeModule();
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType,
        quantity: 1,
        isConsumable: isSupportProduct(productId),
      });
      const purchasedId = transaction?.productIdentifier || productId;
      if (purchasedId !== productId) {
        return { ok: false, reason: 'failed', productId };
      }
      if (transaction?.revocationDate) {
        return { ok: false, reason: 'failed', productId, revoked: true, transaction };
      }
      return {
        ok: true,
        productId,
        transaction,
        revoked: false,
      };
    } catch (error) {
      return { ok: false, reason: classifyPurchaseError(error), productId, error };
    }
  }

  async function verifyProEntitlement() {
    if (!isNative()) {
      return { ok: true, isPro: false, source: 'unavailable', purchases: [] };
    }
    try {
      const { NativePurchases, productType } = await nativeModule();
      const { purchases } = await NativePurchases.getPurchases({ productType });
      return {
        ok: true,
        isPro: entitlementFromPurchases(purchases),
        source: 'storekit',
        purchases: purchases || [],
      };
    } catch {
      return { ok: false, isPro: null, source: 'error', purchases: [] };
    }
  }

  async function restore() {
    if (!isNative()) {
      return { ok: false, reason: 'unavailable', isPro: false };
    }
    try {
      const { NativePurchases, productType } = await nativeModule();
      await NativePurchases.restorePurchases();
      const { purchases } = await NativePurchases.getPurchases({ productType });
      return {
        ok: true,
        isPro: entitlementFromPurchases(purchases),
        purchases: purchases || [],
      };
    } catch (error) {
      if (isUserCancelled(error)) {
        return { ok: false, reason: 'cancelled', isPro: null };
      }
      return { ok: false, reason: 'failed', isPro: null };
    }
  }

  return {
    isNativeStorefront: isNative,
    loadProductPrices,
    purchase,
    verifyProEntitlement,
    restore,
  };
}

const defaultClient = createIapClient();

export const loadProductPrices = (...args) => defaultClient.loadProductPrices(...args);
export const purchase = (...args) => defaultClient.purchase(...args);
export const verifyProEntitlement = (...args) => defaultClient.verifyProEntitlement(...args);
export const restorePurchases = (...args) => defaultClient.restore(...args);
export const isNativeStorefront = () => defaultClient.isNativeStorefront();

export { PRODUCT_IDS };
