import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { resolveBannerAdUnit } from '../lib/ads.js';
import { createAdBannerHost } from '../native/adBanner.js';

function setBannerHeight(px) {
  if (typeof document === 'undefined') return;
  const height = Math.max(0, Number(px) || 0);
  document.documentElement.style.setProperty('--ad-banner-height', `${height}px`);
}

async function loadBundledAdConfig() {
  if (!Capacitor.isNativePlatform()) {
    return { debug: false, bannerAdUnitId: '' };
  }
  try {
    const response = await fetch('admob-config.json');
    if (!response.ok) return { debug: false, bannerAdUnitId: '' };
    const json = await response.json();
    return {
      debug: Boolean(json?.debug),
      bannerAdUnitId: typeof json?.bannerAdUnitId === 'string' ? json.bannerAdUnitId : '',
    };
  } catch {
    return { debug: false, bannerAdUnitId: '' };
  }
}

/**
 * Mounts a native adaptive banner in the bottom safe area.
 * `show` false hides and pauses it (zero height). Pro removes it.
 * Web and screenshot captures never call the plugin.
 */
export function useAdBanner({ show, isAdFree, suppress }) {
  const hostRef = useRef(null);
  const [adUnitId, setAdUnitId] = useState('');
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const native = Capacitor.isNativePlatform() && !suppress;

  useEffect(() => {
    if (!native) {
      setBannerHeight(0);
      return undefined;
    }
    let cancelled = false;
    const host = createAdBannerHost(AdMob, {
      onHeight: setBannerHeight,
      onPrivacyOptions: (required) => {
        if (!cancelled) setPrivacyOptionsRequired(required);
      },
    });
    hostRef.current = host;
    AdMob.requestConsentInfo()
      .then((info) => {
        if (!cancelled && info?.privacyOptionsRequirementStatus === 'REQUIRED') {
          setPrivacyOptionsRequired(true);
        }
      })
      .catch(() => {});
    loadBundledAdConfig().then((config) => {
      if (cancelled) return;
      setAdUnitId(resolveBannerAdUnit(config));
    });
    return () => {
      cancelled = true;
      hostRef.current = null;
      setBannerHeight(0);
      host.remove();
    };
  }, [native]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    if (isAdFree || !show || !adUnitId) {
      if (isAdFree) host.remove();
      else host.sync({ show: false, adUnitId });
      return undefined;
    }
    host.sync({ show: true, adUnitId });
    return undefined;
  }, [show, isAdFree, adUnitId]);

  return {
    privacyOptionsRequired: native && privacyOptionsRequired,
    openPrivacyOptions: () => hostRef.current?.openPrivacyOptions(),
  };
}
