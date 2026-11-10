import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PRODUCT_IDS,
  adFreeAfterPurchase,
  entitlementAfterPurchase,
  isDevProSimulation,
  isProSubscriptionProduct,
  readAdFreeHint,
  readProHint,
  resolveEntitlement,
  writeAdFreeHint,
  writeProHint,
} from '../lib/entitlement.js';
import {
  isNativeStorefront as defaultIsNative,
  loadProductPrices as defaultLoadPrices,
  purchase as defaultPurchase,
  restorePurchases as defaultRestore,
  verifyProEntitlement as defaultVerify,
} from '../lib/iap.js';

function defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function devBuild() {
  return import.meta.env.DEV === true;
}

export function useIap({
  isNativeStorefront = defaultIsNative,
  loadProductPrices = defaultLoadPrices,
  purchase = defaultPurchase,
  restorePurchases = defaultRestore,
  verifyProEntitlement = defaultVerify,
  storage = defaultStorage(),
} = {}) {
  const native = isNativeStorefront();
  const devPro = isDevProSimulation(storage, { dev: devBuild(), native });
  const initialPro = resolveEntitlement({
    hint: readProHint(storage),
    devPro,
    native,
    verifyOk: false,
  });
  const initialLifetime = resolveEntitlement({
    hint: readAdFreeHint(storage),
    devPro: false,
    native,
    verifyOk: false,
  });
  const [isPro, setIsPro] = useState(initialPro);
  const [isAdFree, setIsAdFree] = useState(initialPro || initialLifetime || devPro);
  const [ready, setReady] = useState(() => devPro || !native);
  const [prices, setPrices] = useState({});
  const [products, setProducts] = useState({});
  const [priceStatus, setPriceStatus] = useState(native ? 'loading' : 'unavailable');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const isProRef = useRef(isPro);
  const isAdFreeRef = useRef(isAdFree);
  const pricesRef = useRef(prices);
  const loadSeq = useRef(0);

  useEffect(() => { isProRef.current = isPro; }, [isPro]);
  useEffect(() => { isAdFreeRef.current = isAdFree; }, [isAdFree]);
  useEffect(() => { pricesRef.current = prices; }, [prices]);

  const applyVerified = useCallback((result) => {
    const verifyOk = Boolean(result?.ok);
    const nextPro = resolveEntitlement({
      hint: readProHint(storage),
      verified: result?.isPro,
      verifyOk,
      devPro,
      native,
    });
    const nextLifetime = resolveEntitlement({
      hint: readAdFreeHint(storage),
      verified: result?.hasLifetimeAdFree,
      verifyOk,
      devPro: false,
      native,
    });
    const nextAdFree = Boolean(nextPro || nextLifetime || devPro);
    setIsPro(nextPro);
    setIsAdFree(nextAdFree);
    if (verifyOk && native && !devPro) {
      writeProHint(Boolean(result.isPro), storage);
      writeAdFreeHint(Boolean(result.hasLifetimeAdFree), storage);
    }
    setReady(true);
    return nextAdFree;
  }, [devPro, native, storage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (devPro) {
        setIsPro(true);
        setReady(true);
        return;
      }
      const result = await verifyProEntitlement();
      if (!cancelled) applyVerified(result);
    })();
    return () => { cancelled = true; };
  }, [applyVerified, devPro, verifyProEntitlement]);

  const applyCatalog = useCallback((catalog) => {
    const nextPrices = catalog?.prices || {};
    setPrices(nextPrices);
    setProducts(catalog?.products || {});
    pricesRef.current = nextPrices;
    if (!native || !catalog?.storeAvailable) setPriceStatus(native ? 'failed' : 'unavailable');
    else if (nextPrices[PRODUCT_IDS.adFree]) setPriceStatus('ready');
    else setPriceStatus('failed');
    return catalog;
  }, [native]);

  const reloadPrices = useCallback(async () => {
    if (!native) {
      setPriceStatus('unavailable');
      setPrices({});
      setProducts({});
      pricesRef.current = {};
      return null;
    }
    const seq = loadSeq.current + 1;
    loadSeq.current = seq;
    setPriceStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    const catalog = await loadProductPrices();
    if (loadSeq.current !== seq) return catalog;
    return applyCatalog(catalog);
  }, [applyCatalog, loadProductPrices, native]);

  useEffect(() => {
    reloadPrices();
  }, [reloadPrices]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const buy = useCallback(async (productId) => {
    if (busyId) return { ok: false, reason: 'busy' };
    setNotice('');
    setBusyId(productId);
    try {
      if (native && productId === PRODUCT_IDS.adFree && !pricesRef.current[productId]) {
        const catalog = await reloadPrices();
        if (!catalog?.prices?.[productId]) {
          setNotice('productUnavailable');
          return { ok: false, reason: 'product_unavailable', productId };
        }
      }
      const result = await purchase(productId);
      const nextPro = entitlementAfterPurchase(result, isProRef.current);
      const nextAdFree = nextPro || adFreeAfterPurchase(result, isAdFreeRef.current);
      if (nextPro !== isProRef.current) {
        setIsPro(nextPro);
        if (native && !devPro) writeProHint(nextPro, storage);
      }
      if (nextAdFree !== isAdFreeRef.current) {
        setIsAdFree(nextAdFree);
        if (native && !devPro && result?.productId === PRODUCT_IDS.adFree) {
          writeAdFreeHint(nextAdFree, storage);
        }
      }
      if (result?.ok) setToast('thanks');
      else if (result?.reason === 'pending') setNotice('pending');
      else if (result?.reason === 'unavailable') setNotice('unavailable');
      else if (result?.reason === 'product_unavailable') {
        setNotice('productUnavailable');
        setPriceStatus('failed');
        reloadPrices().then((catalog) => {
          if (catalog?.prices?.[productId]) setNotice('');
        });
      } else if (result?.reason && result.reason !== 'cancelled') {
        setNotice('failed');
        if (isProSubscriptionProduct(productId)) reloadPrices();
      }
      return result;
    } finally {
      setBusyId(null);
    }
  }, [busyId, devPro, native, purchase, reloadPrices, storage]);

  const restore = useCallback(async () => {
    if (busyId) return { ok: false, reason: 'busy' };
    setNotice('');
    setBusyId('restore');
    try {
      const result = await restorePurchases();
      if (result?.reason === 'cancelled') return result;
      if (!result?.ok) {
        setNotice(result?.reason === 'unavailable' ? 'unavailable' : 'restoreFailed');
        return result;
      }
      const nextPro = resolveEntitlement({
        hint: false,
        verified: result.isPro,
        verifyOk: true,
        devPro,
        native,
      });
      const nextLifetime = resolveEntitlement({
        hint: false,
        verified: result.hasLifetimeAdFree,
        verifyOk: true,
        devPro: false,
        native,
      });
      const nextAdFree = Boolean(nextPro || nextLifetime || devPro);
      setIsPro(nextPro);
      setIsAdFree(nextAdFree);
      if (native && !devPro) {
        writeProHint(nextPro, storage);
        writeAdFreeHint(Boolean(result.hasLifetimeAdFree), storage);
      }
      if (nextAdFree) setToast('restored');
      else setNotice('restoreNone');
      return { ...result, isPro: nextPro, isAdFree: nextAdFree };
    } finally {
      setBusyId(null);
    }
  }, [busyId, devPro, native, restorePurchases, storage]);

  return {
    isPro,
    isAdFree,
    ready,
    native,
    devPro,
    prices,
    products,
    priceStatus,
    reloadPrices,
    busyId,
    notice,
    setNotice,
    toast,
    clearToast: () => setToast(''),
    buy,
    restore,
  };
}
