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
    subscriptionLength: strings['pro.subscriptionLength'],
    pricePeriod: strings['pro.pricePeriod'],
    body: strings['pro.paywallBody'],
    trialOffer: strings['pro.trialOffer'],
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

describe('subscription paywall disclosure', () => {
  for (const lang of ['en', 'zh-Hant', 'zh-Hans']) {
    it(`shows title, length, price, and legal links in ${lang}`, () => {
      const html = renderPaywall(lang, { price: 'HK$54.00', priceStatus: 'ready' });
      expect(html).toContain(STRINGS[lang]['pro.subscriptionTitle']);
      expect(html).toContain(STRINGS[lang]['pro.subscriptionLength']);
      expect(html).toContain('HK$54.00');
      expect(html).toContain(STRINGS[lang]['pro.pricePeriod']);
      expect(html).toContain(`href="${PRIVACY_POLICY_URL}"`);
      expect(html).toContain(`href="${TERMS_OF_USE_URL}"`);
      expect(html).not.toContain('target="_blank"');
      expect(html).not.toContain('rel="noopener');
      expect(html.indexOf('data-testid="privacy-policy-link"')).toBeLessThan(
        html.indexOf(STRINGS[lang]['pro.restore']),
      );
      expect(html).toContain(STRINGS[lang]['pro.privacy']);
      expect(html).toContain(STRINGS[lang]['pro.terms']);
      expect(html).not.toContain('6.99');
      expect(html).not.toContain('data-testid="paywall-retry"');
    });
  }

  it('uses the StoreKit product title when the store provides one', () => {
    const html = renderPaywall('en', {
      price: 'HK$54.00',
      priceStatus: 'ready',
      subscriptionTitle: 'Chord Trainer Pro Monthly',
    });
    expect(html).toContain('Chord Trainer Pro Monthly');
    expect(html).toContain('1 month, auto-renews');
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
    expect(html).toContain(STRINGS['zh-Hant']['pro.subscriptionLength']);
    expect(html).toContain(`href="${PRIVACY_POLICY_URL}"`);
    expect(html).toContain(`href="${TERMS_OF_USE_URL}"`);
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('6.99');
  });
});
