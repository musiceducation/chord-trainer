import { Capacitor } from '@capacitor/core';

/** Consumable tip product IDs — must match App Store Connect exactly. */
export const TIP_PRODUCT_IDS = Object.freeze({
  lemonTea: 'com.musiceducation.chordtrainer.tip.lemontea',
  coffee: 'com.musiceducation.chordtrainer.tip.coffee',
});

export const TIP_PRODUCT_ID_LIST = Object.freeze([
  TIP_PRODUCT_IDS.lemonTea,
  TIP_PRODUCT_IDS.coffee,
]);

export const TIP_COPY = Object.freeze({
  title: '支持一下',
  restore: '恢復購買',
  thankYou: '唔該晒',
  subtitle: '所有訓練功能都係免費，打賞純屬自願。',
  restoreNothing: '打賞係消耗型項目，冇嘢可以恢復。',
  restoreFailed: '暫時無法恢復購買，請稍後再試。',
  purchaseFailed: '購買未能完成，請稍後再試。',
  webPreview: '網頁預覽：模擬購買',
});

export const TIP_TIERS = Object.freeze([
  {
    key: 'lemonTea',
    productId: TIP_PRODUCT_IDS.lemonTea,
    label: '請飲杯凍檸茶',
    fallbackPrice: '$0.99',
  },
  {
    key: 'coffee',
    productId: TIP_PRODUCT_IDS.coffee,
    label: '請飲杯啡',
    fallbackPrice: '$4.99',
  },
]);

const INAPP = 'inapp';

function defaultIsNative() {
  return Capacitor.isNativePlatform();
}

async function defaultGetNativePurchases() {
  return import('@capgo/native-purchases');
}

function isUserCancelled(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return (
    code === 'USER_CANCELLED'
    || code === 'PURCHASE_CANCELLED'
    || code === '1'
    || message.includes('cancel')
  );
}

function withFallbackPrice(tier, product) {
  const priceString = product?.priceString
    || (product?.price != null ? String(product.price) : null)
    || tier.fallbackPrice;
  return {
    ...tier,
    priceString,
    storeTitle: product?.title || product?.localizedTitle || null,
  };
}

/**
 * StoreKit client. Inject dependencies in tests; production uses Capacitor +
 * @capgo/native-purchases on iOS and a mock success path on web/dev.
 */
export function createIapClient(deps = {}) {
  const {
    isNative = defaultIsNative,
    getNativePurchases = defaultGetNativePurchases,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    mockWaitMs = 320,
  } = deps;

  async function loadTipProducts() {
    const fallback = TIP_TIERS.map((tier) => withFallbackPrice(tier, null));
    if (!isNative()) return fallback;

    try {
      const mod = await getNativePurchases();
      const NativePurchases = mod.NativePurchases;
      const PURCHASE_TYPE = mod.PURCHASE_TYPE || { INAPP };
      const billing = await NativePurchases.isBillingSupported?.();
      if (billing && billing.isBillingSupported === false) return fallback;

      const { products } = await NativePurchases.getProducts({
        productIdentifiers: [...TIP_PRODUCT_ID_LIST],
        productType: PURCHASE_TYPE.INAPP || INAPP,
      });
      const byId = Object.fromEntries(
        (products || []).map((product) => [product.identifier, product]),
      );
      return TIP_TIERS.map((tier) => withFallbackPrice(tier, byId[tier.productId]));
    } catch {
      return fallback;
    }
  }

  async function purchaseTip(productId) {
    if (!TIP_PRODUCT_ID_LIST.includes(productId)) {
      return { ok: false, reason: 'unknown_product' };
    }

    if (!isNative()) {
      await wait(mockWaitMs);
      return { ok: true, mocked: true, productId };
    }

    try {
      const mod = await getNativePurchases();
      const NativePurchases = mod.NativePurchases;
      const PURCHASE_TYPE = mod.PURCHASE_TYPE || { INAPP };
      await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP || INAPP,
        quantity: 1,
        isConsumable: true,
      });
      return { ok: true, mocked: false, productId };
    } catch (error) {
      if (isUserCancelled(error)) {
        return { ok: false, reason: 'cancelled' };
      }
      return { ok: false, reason: 'failed', error };
    }
  }

  async function restoreTips() {
    if (!isNative()) {
      return {
        ok: true,
        restored: false,
        consumable: true,
        message: TIP_COPY.restoreNothing,
      };
    }

    try {
      const mod = await getNativePurchases();
      await mod.NativePurchases.restorePurchases();
      return {
        ok: true,
        restored: false,
        consumable: true,
        message: TIP_COPY.restoreNothing,
      };
    } catch {
      return {
        ok: false,
        restored: false,
        consumable: true,
        message: TIP_COPY.restoreFailed,
      };
    }
  }

  return {
    isNativeStorefront: isNative,
    loadTipProducts,
    purchaseTip,
    restoreTips,
  };
}

const defaultClient = createIapClient();

export const loadTipProducts = (...args) => defaultClient.loadTipProducts(...args);
export const purchaseTip = (...args) => defaultClient.purchaseTip(...args);
export const restoreTips = (...args) => defaultClient.restoreTips(...args);
export const isNativeStorefront = () => defaultClient.isNativeStorefront();
