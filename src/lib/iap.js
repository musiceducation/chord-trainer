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

function errorText(error) {
  return [error?.code, error?.message, error?.errorMessage]
    .filter((part) => part != null && part !== '')
    .join(' ')
    .toLowerCase();
}

/**
 * Map a StoreKit / plugin rejection to a paywall outcome.
 * Product-missing is separate from a generic failure so the UI can reload
 * the catalog instead of looping the same dead-end message.
 */
export function classifyStoreError(error) {
  if (isUserCancelled(error)) return 'cancelled';
  if (isPurchasePending(error)) return 'pending';
  const text = errorText(error);
  if (
    text.includes('cannot find product')
    || text.includes('product not found')
    || text.includes('product_not_found')
    || text.includes('itemunavailable')
    || text.includes('not available')
  ) {
    return 'product_unavailable';
  }
  return 'failed';
}

/**
 * Subscribe is only offered once StoreKit has returned a price.
 * Missing products get a retry, not a purchase call that rejects.
 */
export function purchaseGate({ native, price, priceStatus }) {
  if (!native) return 'unavailable';
  if (price) return 'ready';
  if (priceStatus === 'loading') return 'loading';
  return 'needs_retry';
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function rememberProduct(prices, products, product) {
  const id = product?.identifier;
  if (!id) return;
  const price = storePriceString(product);
  const title = typeof product?.title === 'string' ? product.title.trim() : '';
  if (price) prices[id] = price;
  products[id] = {
    title: title || null,
    price: price || null,
  };
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
    sleep = defaultSleep,
    retryDelayMs = 300,
    maxAttempts = 3,
  } = deps;

  async function nativeModule() {
    const mod = await getNativePurchases();
    return {
      NativePurchases: mod.NativePurchases,
      PURCHASE_TYPE: mod.PURCHASE_TYPE || { INAPP, SUBS },
    };
  }

  async function fetchProductList(NativePurchases, ids, productType, { retryEmpty = false } = {}) {
    let lastError = null;
    const attempts = Math.max(1, maxAttempts);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const { products } = await NativePurchases.getProducts({
          productIdentifiers: [...ids],
          productType,
        });
        const list = products || [];
        const tryAgain = list.length === 0 && retryEmpty && attempt < attempts - 1;
        if (!tryAgain) return { products: list, error: null };
      } catch (error) {
        lastError = error;
        if (attempt === attempts - 1) return { products: [], error };
      }
      if (attempt < attempts - 1) await sleep(retryDelayMs * (attempt + 1));
    }
    return { products: [], error: lastError };
  }

  async function loadProductPrices() {
    const empty = {
      storeAvailable: false,
      loadFailed: false,
      subscriptionReady: false,
      prices: {},
      products: {},
      missingProductIds: [],
    };
    if (!isNative()) return empty;

    try {
      const { NativePurchases, PURCHASE_TYPE } = await nativeModule();
      const billing = await NativePurchases.isBillingSupported?.();
      if (billing && billing.isBillingSupported === false) {
        return {
          ...empty,
          storeAvailable: false,
          loadFailed: true,
          missingProductIds: [...ALL_PRODUCT_IDS],
        };
      }

      const prices = {};
      const products = {};
      const inappIds = ALL_PRODUCT_IDS.filter((id) => !isProSubscriptionProduct(id));
      const subsIds = ALL_PRODUCT_IDS.filter((id) => isProSubscriptionProduct(id));

      // Support and subscription queries are independent. A missing support SKU
      // must not hide Pro Monthly or mark the subscription as failed.
      if (inappIds.length) {
        const fetched = await fetchProductList(
          NativePurchases,
          inappIds,
          PURCHASE_TYPE.INAPP || INAPP,
        );
        fetched.products.forEach((product) => rememberProduct(prices, products, product));
      }

      if (subsIds.length) {
        const fetched = await fetchProductList(
          NativePurchases,
          subsIds,
          PURCHASE_TYPE.SUBS || SUBS,
          { retryEmpty: true },
        );
        fetched.products.forEach((product) => {
          rememberProduct(prices, products, product);
          const id = product?.identifier;
          const price = storePriceString(product);
          // Capgo may return introductory-offer rows under a related id.
          if (id && price && (subsIds.includes(id) || id.startsWith(PRODUCT_IDS.pro))) {
            prices[PRODUCT_IDS.pro] = prices[PRODUCT_IDS.pro] || price;
            if (!products[PRODUCT_IDS.pro]) products[PRODUCT_IDS.pro] = products[id];
          }
        });
      }

      const missingProductIds = ALL_PRODUCT_IDS.filter((id) => !prices[id]);
      const subscriptionReady = Boolean(prices[PRODUCT_IDS.pro]);
      return {
        storeAvailable: true,
        loadFailed: !subscriptionReady,
        subscriptionReady,
        prices,
        products,
        missingProductIds,
      };
    } catch {
      return {
        storeAvailable: true,
        loadFailed: true,
        subscriptionReady: false,
        prices: {},
        products: {},
        missingProductIds: [...ALL_PRODUCT_IDS],
      };
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
      // Do not send quantity for auto-renewable Pro. Capgo 7.19.3 still
      // defaults a missing quantity to 1 and inserts PurchaseOption.quantity,
      // which StoreKit rejects. scripts/patch-native-purchases.mjs removes
      // that option for subscriptions at install time.
      const request = {
        productIdentifier: productId,
        productType,
        isConsumable: isSupportProduct(productId),
      };
      if (!isProSubscriptionProduct(productId)) request.quantity = 1;
      const transaction = await NativePurchases.purchaseProduct(request);
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
      return { ok: false, reason: classifyStoreError(error), productId, error };
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
