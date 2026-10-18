import { Capacitor } from '@capacitor/core';
import {
  ALL_PRODUCT_IDS,
  PRODUCT_IDS,
  PRO_PRODUCT_IDS,
  entitlementFromPurchases,
  isProSubscriptionProduct,
  isSupportProduct,
} from './entitlement.js';

const INAPP = 'inapp';
const SUBS = 'subs';

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

function purchaseTypeFor(productId, PURCHASE_TYPE) {
  if (isProSubscriptionProduct(productId)) {
    return PURCHASE_TYPE?.SUBS || SUBS;
  }
  return PURCHASE_TYPE?.INAPP || INAPP;
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
    return {
      NativePurchases: mod.NativePurchases,
      PURCHASE_TYPE: mod.PURCHASE_TYPE || { INAPP, SUBS },
    };
  }

  async function loadProductPrices() {
    if (!isNative()) {
      return { storeAvailable: false, loadFailed: false, prices: {} };
    }

    try {
      const { NativePurchases, PURCHASE_TYPE } = await nativeModule();
      const billing = await NativePurchases.isBillingSupported?.();
      if (billing && billing.isBillingSupported === false) {
        return { storeAvailable: false, loadFailed: true, prices: {} };
      }

      const prices = {};
      const inappIds = ALL_PRODUCT_IDS.filter((id) => !isProSubscriptionProduct(id));
      const subsIds = ALL_PRODUCT_IDS.filter((id) => isProSubscriptionProduct(id));

      if (inappIds.length) {
        const { products } = await NativePurchases.getProducts({
          productIdentifiers: [...inappIds],
          productType: PURCHASE_TYPE.INAPP || INAPP,
        });
        (products || []).forEach((product) => {
          const price = storePriceString(product);
          if (product?.identifier && price) prices[product.identifier] = price;
        });
      }

      if (subsIds.length) {
        const { products } = await NativePurchases.getProducts({
          productIdentifiers: [...subsIds],
          productType: PURCHASE_TYPE.SUBS || SUBS,
        });
        (products || []).forEach((product) => {
          const price = storePriceString(product);
          // Capgo may return offer rows; prefer base monthly product id match.
          const id = product?.identifier;
          if (id && price && (subsIds.includes(id) || id.startsWith(PRODUCT_IDS.pro))) {
            prices[PRODUCT_IDS.pro] = prices[PRODUCT_IDS.pro] || price;
            if (subsIds.includes(id)) prices[id] = price;
          }
        });
      }

      const loadFailed = ALL_PRODUCT_IDS.some((id) => !prices[id]);
      return { storeAvailable: true, loadFailed, prices };
    } catch {
      return { storeAvailable: true, loadFailed: true, prices: {} };
    }
  }

  async function purchase(productId) {
    if (!ALL_PRODUCT_IDS.includes(productId) && !PRO_PRODUCT_IDS.includes(productId)) {
      return { ok: false, reason: 'unknown_product', productId };
    }
    if (!isNative()) {
      return { ok: false, reason: 'unavailable', productId };
    }

    try {
      const { NativePurchases, PURCHASE_TYPE } = await nativeModule();
      const productType = purchaseTypeFor(productId, PURCHASE_TYPE);
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

  async function collectPurchases(NativePurchases, PURCHASE_TYPE) {
    const lists = [];
    let okCount = 0;
    try {
      const { purchases } = await NativePurchases.getPurchases({
        productType: PURCHASE_TYPE.INAPP || INAPP,
      });
      lists.push(...(purchases || []));
      okCount += 1;
    } catch {
      /* legacy NC query may fail on some builds */
    }
    try {
      const { purchases } = await NativePurchases.getPurchases({
        productType: PURCHASE_TYPE.SUBS || SUBS,
      });
      lists.push(...(purchases || []));
      okCount += 1;
    } catch {
      /* subscription query may fail if SKU not live yet */
    }
    return { purchases: lists, okCount };
  }

  async function verifyProEntitlement() {
    if (!isNative()) {
      return { ok: true, isPro: false, source: 'unavailable', purchases: [] };
    }
    try {
      const { NativePurchases, PURCHASE_TYPE } = await nativeModule();
      const { purchases, okCount } = await collectPurchases(NativePurchases, PURCHASE_TYPE);
      if (okCount === 0) {
        return { ok: false, isPro: null, source: 'error', purchases: [] };
      }
      return {
        ok: true,
        isPro: entitlementFromPurchases(purchases),
        source: 'storekit',
        purchases,
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
      const { NativePurchases, PURCHASE_TYPE } = await nativeModule();
      await NativePurchases.restorePurchases();
      const collected = await collectPurchases(NativePurchases, PURCHASE_TYPE);
      return {
        ok: true,
        isPro: entitlementFromPurchases(collected.purchases),
        purchases: collected.purchases,
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
