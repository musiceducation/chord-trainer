import { Capacitor } from '@capacitor/core';

/**
 * Open a legal URL from the paywall.
 *
 * WKWebView treats `<a target="_blank" rel="noopener">` as a new window whose
 * first request is `about:blank`, so Capacitor never receives the real URL and
 * the tap does nothing. App Review reads that as a missing Privacy / EULA link.
 *
 * On iOS, `@capacitor/browser` presents SFSafariViewController. If that plugin
 * is unavailable, assign the same URL on the main frame: Capacitor then hands
 * the real https URL to Safari.
 */
export async function openExternalUrl(url, {
  isNative = () => Capacitor.isNativePlatform(),
  openBrowser,
  openWindow,
  assignLocation,
} = {}) {
  if (typeof url !== 'string' || !url.trim()) return 'invalid';
  const target = url.trim();

  if (isNative()) {
    try {
      if (openBrowser) await openBrowser(target);
      else {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({
          url: target,
          presentationStyle: 'fullscreen',
        });
      }
      return 'browser';
    } catch {
      // SFSafariViewController did not present. Fall through.
    }
    if (assignLocation) assignLocation(target);
    else if (typeof window !== 'undefined') window.location.assign(target);
    return 'assign';
  }

  if (openWindow) openWindow(target);
  else if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
  return 'window';
}
