import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaywallSheet } from '../components/PaywallSheet.jsx';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../lib/legal.js';
import { STRINGS } from '../lib/i18n.js';

function renderPaywall(lang, extra = {}) {
  const strings = STRINGS[lang];
  return renderToStaticMarkup(createElement(PaywallSheet, {
    open: true,
    title: strings['pro.paywallTitle'],
    subscriptionTitle: extra.subscriptionTitle || strings['pro.subscriptionTitle'],
    subscriptionLength: '',
    pricePeriod: '',
    body: strings['pro.paywallBody'],
    adFree: strings['pro.adFree'],
    trialOffer: null,
    price: extra.price,
    priceStatus: extra.priceStatus || (extra.price ? 'ready' : 'failed'),
    unavailableLabel: strings['pro.priceUnavailable'],
    storeUnavailableLabel: strings['iap.unavailable'],
    native: extra.native !== false,
    buyLabel: strings['pro.buy'],
    restoreLabel: strings['pro.restore'],
    closeLabel: 'Close',
    retryLabel: strings['iap.retry'],
    privacyLabel: strings['pro.privacy'],
    termsLabel: strings['pro.terms'],
    notice: extra.notice || '',
    busy: false,
    onBuy: () => {},
    onRestore: () => {},
    onRetry: () => {},
    onClose: () => {},
  }));
}

describe('ad-free paywall', () => {
  for (const lang of ['en', 'zh-Hant', 'zh-Hans']) {
    it(`shows the one-time Ad-free offer, price, and legal links in ${lang}`, () => {
      const html = renderPaywall(lang, { price: 'HK$38.00', priceStatus: 'ready' });
      expect(html).toContain(STRINGS[lang]['pro.subscriptionTitle']);
      expect(html).toContain(STRINGS[lang]['pro.paywallBody']);
      expect(html).toContain('HK$38.00');
      expect(html).not.toContain('1 month');
      expect(html).not.toContain('auto-renew');
      expect(html).not.toContain('七日');
      expect(html).toContain(`href="${PRIVACY_POLICY_URL}"`);
      expect(html).toContain(`href="${TERMS_OF_USE_URL}"`);
      expect(html).not.toContain('target="_blank"');
      expect(html).not.toContain('rel="noopener');
      expect(html.indexOf('data-testid="privacy-policy-link"')).toBeLessThan(
        html.indexOf(STRINGS[lang]['pro.restore']),
      );
      expect(html).toContain(STRINGS[lang]['pro.adFree']);
      expect(html).toContain('data-testid="paywall-ad-free"');
      expect(html).toContain(STRINGS[lang]['pro.privacy']);
      expect(html).toContain(STRINGS[lang]['pro.terms']);
      expect(html).not.toContain('6.99');
      expect(html).not.toContain('data-testid="paywall-retry"');
    });
  }

  it('uses the StoreKit product title when the store provides one', () => {
    const html = renderPaywall('en', {
      price: 'HK$38.00',
      priceStatus: 'ready',
      subscriptionTitle: 'Ad-free',
    });
    expect(html).toContain('Ad-free');
    expect(html).toContain('All modes are free');
    expect(html).toContain('$4.99 removes ads');
    expect(html).not.toContain('1 month');
  });

  it('keeps Subscribe disabled and offers retry when the product did not load', () => {
    const html = renderPaywall('zh-Hant', {
      price: '',
      priceStatus: 'failed',
      notice: STRINGS['zh-Hant']['iap.productUnavailable'],
    });
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-testid="paywall-retry"');
    expect(html).toContain(STRINGS['zh-Hant']['iap.retry']);
    expect(html).toContain(STRINGS['zh-Hant']['pro.subscriptionTitle']);
    expect(html).toContain(STRINGS['zh-Hant']['pro.paywallBody']);
    expect(html).not.toContain('自動續訂');
    expect(html).toContain(`href="${PRIVACY_POLICY_URL}"`);
    expect(html).toContain(`href="${TERMS_OF_USE_URL}"`);
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('6.99');
  });
});
