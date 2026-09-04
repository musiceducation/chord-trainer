import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { createSupportStoreController, snapshotProducts } from '../lib/iap.js';
import { readShotConfig } from '../lib/shotMode.js';

function loadPlugin() {
  return import('capacitor-plugin-cdv-purchase');
}

const isShot = Boolean(readShotConfig());
const nativeStore = Capacitor.isNativePlatform() && !isShot
  ? createSupportStoreController({ loadPlugin })
  : null;

export function useIap() {
  const native = Boolean(nativeStore);
  const [products, setProducts] = useState(() => snapshotProducts());
  const [ready, setReady] = useState(!native);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(isShot ? 'ready' : (native ? 'loading' : 'web'));

  useEffect(() => {
    if (!nativeStore) return undefined;
    let cancelled = false;
    nativeStore.loadProducts()
      .then((next) => {
        if (cancelled) return;
        setProducts(next);
        setReady(true);
        setStatus(next.some((item) => item.fromStore) ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (cancelled) return;
        setReady(true);
        setStatus('unavailable');
      });
    return () => { cancelled = true; };
  }, [native]);

  const buy = useCallback(async (productId) => {
    if (!nativeStore) {
      setStatus('web');
      return { ok: false, cancelled: false };
    }
    setBusyId(productId);
    try {
      const result = await nativeStore.purchase(productId);
      if (result.ok) setStatus('thanks');
      else if (!result.cancelled && result.message === 'unavailable') setStatus('unavailable');
      else if (!result.cancelled) setStatus('error');
      return result;
    } catch {
      setStatus('error');
      return { ok: false, cancelled: false };
    } finally {
      setBusyId(null);
    }
  }, []);

  return useMemo(() => ({
    native,
    products,
    ready,
    busyId,
    status,
    buy,
  }), [native, products, ready, busyId, status, buy]);
}
