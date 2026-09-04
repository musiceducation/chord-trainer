export const SUPPORT_PRODUCTS = Object.freeze([
  {
    id: 'com.musiceducation.chordtrainer.support.small',
    key: 'small',
    fallbackPrice: '$0.99',
  },
  {
    id: 'com.musiceducation.chordtrainer.support.large',
    key: 'large',
    fallbackPrice: '$4.99',
  },
]);

export const SUPPORT_PRODUCT_IDS = SUPPORT_PRODUCTS.map((item) => item.id);

export function snapshotProducts(getProduct) {
  return SUPPORT_PRODUCTS.map((item) => {
    const product = typeof getProduct === 'function' ? getProduct(item.id) : null;
    const storePrice = product?.pricing?.price;
    return {
      id: item.id,
      key: item.key,
      price: storePrice || item.fallbackPrice,
      canPurchase: Boolean(product?.canPurchase),
      fromStore: Boolean(storePrice),
    };
  });
}

export function isCancelledPurchase(error, cancelledCode) {
  if (!error) return false;
  return error.code === cancelledCode;
}

export function createSupportStoreController({ loadPlugin }) {
  let plugin = null;
  let started = false;
  let startPromise = null;

  async function ensureStarted() {
    if (started) return plugin;
    if (startPromise) return startPromise;
    startPromise = (async () => {
      plugin = await loadPlugin();
      const { store, ProductType, Platform } = plugin;
      store.register(SUPPORT_PRODUCTS.map((item) => ({
        id: item.id,
        type: ProductType.CONSUMABLE,
        platform: Platform.APPLE_APPSTORE,
      })));
      store.when().approved((transaction) => {
        transaction.finish();
      });
      await store.initialize([Platform.APPLE_APPSTORE]);
      await store.update();
      started = true;
      return plugin;
    })();
    try {
      return await startPromise;
    } catch (err) {
      startPromise = null;
      started = false;
      plugin = null;
      throw err;
    }
  }

  async function loadProducts() {
    const active = await ensureStarted();
    await active.store.update();
    return snapshotProducts((id) => active.store.get(id));
  }

  async function purchase(productId) {
    const active = await ensureStarted();
    const offer = active.store.get(productId)?.getOffer();
    if (!offer) {
      return { ok: false, cancelled: false, message: 'unavailable' };
    }
    const error = await offer.order();
    if (error) {
      if (isCancelledPurchase(error, active.ErrorCode.PAYMENT_CANCELLED)) {
        return { ok: false, cancelled: true, message: null };
      }
      return { ok: false, cancelled: false, message: error.message || 'error' };
    }
    return { ok: true, cancelled: false, message: null };
  }

  return { loadProducts, purchase };
}
