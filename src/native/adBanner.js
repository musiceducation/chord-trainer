import {
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

/**
 * Google's default UMP flow: refresh consent, then present the form only when
 * one is available. `loadAndPresentIfRequired` is what the plugin calls.
 * A missing form is not a failure — non-regulated regions can request ads.
 */
export async function gatherConsent(admob) {
  const info = await admob.requestConsentInfo();
  let next = info || {};
  if (next.isConsentFormAvailable) {
    try {
      const presented = await admob.showConsentForm();
      if (presented) next = { ...next, ...presented };
    } catch {
      // Keep the status from requestConsentInfo. UMP still knows the last session.
    }
  }
  return {
    canRequestAds: Boolean(next.canRequestAds),
    privacyOptionsRequired: next.privacyOptionsRequirementStatus === 'REQUIRED',
  };
}

/**
 * Native banner host. Hide pauses an already loaded banner (height 0).
 * Pro removes it. This never draws a web placeholder.
 *
 * `isTesting` stays false. Plugin 7.2.0 substitutes an Android demo unit when
 * `isTesting` is true, which is the wrong iOS banner. Debug passes Google's
 * iOS test unit as `adId` instead.
 */
export function createAdBannerHost(admob, { onHeight = () => {}, onPrivacyOptions = () => {} } = {}) {
  let phase = 'idle';
  let chain = Promise.resolve();
  let preparing = null;
  let listener = null;

  function run(task) {
    const next = chain.then(task, task);
    chain = next.then(() => undefined, () => undefined);
    return next;
  }

  function setHeight(height) {
    onHeight(phase === 'shown' ? Math.max(0, Number(height) || 0) : 0);
  }

  async function ensureListener() {
    if (listener || typeof admob.addListener !== 'function') return;
    listener = await admob.addListener(BannerAdPluginEvents.SizeChanged, (info) => {
      setHeight(info?.height);
    });
  }

  async function ensureReady() {
    if (!preparing) {
      preparing = (async () => {
        await admob.setApplicationMuted({ muted: true });
        await admob.setApplicationVolume({ volume: 0 });
        const consent = await gatherConsent(admob);
        onPrivacyOptions(consent.privacyOptionsRequired);
        if (!consent.canRequestAds) return false;
        await admob.initialize();
        await ensureListener();
        return true;
      })().catch((error) => {
        preparing = null;
        throw error;
      });
    }
    return preparing;
  }

  async function show(adUnitId) {
    const ready = await ensureReady();
    if (!ready || !adUnitId) {
      setHeight(0);
      return;
    }
    if (phase === 'hidden') {
      phase = 'shown';
      try {
        await admob.resumeBanner();
        return;
      } catch {
        phase = 'idle';
      }
    }
    if (phase === 'shown') return;
    await admob.showBanner({
      adId: adUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: false,
    });
    phase = 'shown';
  }

  return {
    sync({ show: visible, adUnitId }) {
      return run(async () => {
        if (!visible) {
          if (phase === 'shown') {
            phase = 'hidden';
            setHeight(0);
            await admob.hideBanner();
          } else {
            setHeight(0);
          }
          return;
        }
        await show(adUnitId);
      });
    },
    remove() {
      return run(async () => {
        phase = 'idle';
        setHeight(0);
        if (typeof admob.removeBanner === 'function') {
          try {
            await admob.removeBanner();
          } catch {
            /* already gone */
          }
        }
      });
    },
    openPrivacyOptions() {
      if (typeof admob.showPrivacyOptionsForm !== 'function') return Promise.resolve();
      return admob.showPrivacyOptionsForm();
    },
  };
}
