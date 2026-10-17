import { Capacitor } from '@capacitor/core';

/**
 * Ask StoreKit / Play for the native in-app review sheet.
 * No-ops on web. Apple may ignore the call under its rate limits.
 */
export async function requestNativeReview({
  isNative = () => Capacitor.isNativePlatform(),
  getInAppReview = async () => {
    const mod = await import('@capacitor-community/in-app-review');
    return mod.InAppReview;
  },
} = {}) {
  if (!isNative()) return { ok: false, reason: 'web' };
  try {
    const InAppReview = await getInAppReview();
    await InAppReview.requestReview();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}
