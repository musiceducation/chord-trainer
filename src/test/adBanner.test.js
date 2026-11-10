import { describe, expect, it, vi } from 'vitest';
import { BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { GOOGLE_TEST_IOS_BANNER_ID } from '../lib/ads.js';
import { createAdBannerHost, gatherConsent } from '../native/adBanner.js';

function fakeAdmob(consent) {
  const calls = [];
  const admob = {
    calls,
    requestConsentInfo: vi.fn(async () => consent),
    showConsentForm: vi.fn(async () => consent),
    setApplicationMuted: vi.fn(async () => {}),
    setApplicationVolume: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
    showBanner: vi.fn(async () => {}),
    hideBanner: vi.fn(async () => {}),
    resumeBanner: vi.fn(async () => {}),
    removeBanner: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: () => {} })),
  };
  return admob;
}

describe('gatherConsent', () => {
  it('presents the UMP form when one is available', async () => {
    const admob = fakeAdmob({
      status: 'REQUIRED',
      isConsentFormAvailable: true,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'UNKNOWN',
    });
    admob.showConsentForm.mockResolvedValue({
      status: 'OBTAINED',
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'REQUIRED',
    });
    const result = await gatherConsent(admob);
    expect(admob.requestConsentInfo).toHaveBeenCalledOnce();
    expect(admob.showConsentForm).toHaveBeenCalledOnce();
    expect(result).toEqual({ canRequestAds: true, privacyOptionsRequired: true });
  });

  it('does not present a form when UMP has none', async () => {
    const admob = fakeAdmob({
      status: 'NOT_REQUIRED',
      isConsentFormAvailable: false,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED',
    });
    const result = await gatherConsent(admob);
    expect(admob.showConsentForm).not.toHaveBeenCalled();
    expect(result.canRequestAds).toBe(true);
  });
});

describe('createAdBannerHost', () => {
  it('mutes ads, then shows the iOS test banner only after consent', async () => {
    const admob = fakeAdmob({
      status: 'NOT_REQUIRED',
      isConsentFormAvailable: false,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED',
    });
    const heights = [];
    const host = createAdBannerHost(admob, { onHeight: (height) => heights.push(height) });
    await host.sync({ show: true, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    expect(admob.setApplicationMuted).toHaveBeenCalledWith({ muted: true });
    expect(admob.setApplicationVolume).toHaveBeenCalledWith({ volume: 0 });
    expect(admob.initialize).toHaveBeenCalledOnce();
    expect(admob.showBanner).toHaveBeenCalledWith({
      adId: GOOGLE_TEST_IOS_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: false,
    });

    await host.sync({ show: false, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    expect(admob.hideBanner).toHaveBeenCalledOnce();
    expect(heights.at(-1)).toBe(0);

    await host.sync({ show: true, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    expect(admob.resumeBanner).toHaveBeenCalledOnce();
    expect(admob.showBanner).toHaveBeenCalledOnce();
  });

  it('does not request a banner when consent does not allow ads', async () => {
    const admob = fakeAdmob({
      status: 'REQUIRED',
      isConsentFormAvailable: false,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED',
    });
    const host = createAdBannerHost(admob);
    await host.sync({ show: true, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    expect(admob.showBanner).not.toHaveBeenCalled();
    expect(admob.initialize).not.toHaveBeenCalled();
  });

  it('removes the banner for Pro instead of leaving it loaded', async () => {
    const admob = fakeAdmob({
      status: 'NOT_REQUIRED',
      isConsentFormAvailable: false,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED',
    });
    const host = createAdBannerHost(admob);
    await host.sync({ show: true, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    await host.remove();
    expect(admob.removeBanner).toHaveBeenCalledOnce();
    await host.sync({ show: true, adUnitId: GOOGLE_TEST_IOS_BANNER_ID });
    expect(admob.showBanner).toHaveBeenCalledTimes(2);
  });
});
