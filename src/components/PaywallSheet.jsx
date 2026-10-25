import { purchaseGate } from '../lib/iap.js';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../lib/legal.js';
import { openExternalUrl } from '../lib/openExternalUrl.js';

export function priceText({ price, status, unavailableLabel }) {
  if (price) return price;
  if (status === 'loading') return '…';
  return unavailableLabel;
}

export function LegalLinks({
  privacyLabel,
  termsLabel,
  className = '',
  openUrl = openExternalUrl,
}) {
  const linkClass = 'inline-flex items-center justify-center min-h-11 px-2 text-xs font-semibold text-amber-200 underline underline-offset-2';
  const open = (event, url) => {
    event.preventDefault();
    openUrl(url);
  };
  return (
    <div className={`relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <a
        href={PRIVACY_POLICY_URL}
        className={linkClass}
        data-testid="privacy-policy-link"
        onClick={(event) => open(event, PRIVACY_POLICY_URL)}
      >
        {privacyLabel}
      </a>
      <a
        href={TERMS_OF_USE_URL}
        className={linkClass}
        data-testid="terms-of-use-link"
        onClick={(event) => open(event, TERMS_OF_USE_URL)}
      >
        {termsLabel}
      </a>
    </div>
  );
}

export function PaywallSheet({
  open,
  title,
  subscriptionTitle,
  subscriptionLength,
  pricePeriod,
  body,
  trialOffer,
  price,
  priceStatus,
  unavailableLabel,
  storeUnavailableLabel,
  native,
  buyLabel,
  restoreLabel,
  closeLabel,
  retryLabel,
  privacyLabel,
  termsLabel,
  notice,
  busy,
  onBuy,
  onRestore,
  onRetry,
  onClose,
}) {
  if (!open) return null;
  const gate = purchaseGate({ native, price, priceStatus });
  const shownPrice = price
    ? `${price}${pricePeriod ? ` · ${pricePeriod}` : ''}`
    : priceText({ price, status: priceStatus, unavailableLabel });
  const showRetry = gate === 'needs_retry';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm max-h-[min(92dvh,680px)] overflow-y-auto rounded-2xl p-5 panel-solid">
        <h2 id="paywall-title" className="text-base font-semibold text-slate-100 mb-1">
          {subscriptionTitle || title}
        </h2>
        {subscriptionLength && (
          <p className="text-sm text-slate-200 mb-2" data-testid="paywall-length">
            {subscriptionLength}
          </p>
        )}
        {!native && (
          <p className="text-sm text-slate-300 mb-3" role="status">{storeUnavailableLabel}</p>
        )}
        {native && (
          <p className="mono-font text-lg font-bold text-amber-200 mb-3" data-testid="paywall-price">
            {shownPrice}
          </p>
        )}
        {trialOffer && (
          <p className="text-xs text-emerald-300/90 leading-relaxed mb-2">{trialOffer}</p>
        )}
        {body && (
          <p className="text-sm text-slate-400 mb-3">{body}</p>
        )}
        {notice && notice !== storeUnavailableLabel && (
          <p className="text-xs text-slate-300 mb-3" role="status">{notice}</p>
        )}
        <div className="flex flex-col gap-2">
          {showRetry && (
            <button
              type="button"
              className="btn-secondary justify-center touch-none"
              disabled={busy}
              onClick={onRetry}
              data-testid="paywall-retry"
            >
              {busy ? '…' : retryLabel}
            </button>
          )}
          <button
            type="button"
            className="py-2.5 rounded-xl text-sm font-semibold text-slate-900 touch-none active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #E8C872, #C9A050)' }}
            disabled={busy || gate !== 'ready'}
            onClick={onBuy}
          >
            {busy ? '…' : buyLabel}
          </button>
          <LegalLinks privacyLabel={privacyLabel} termsLabel={termsLabel} className="justify-center" />
          <button
            type="button"
            className="btn-secondary justify-center touch-none"
            disabled={busy || !native}
            onClick={onRestore}
          >
            {restoreLabel}
          </button>
          <button
            type="button"
            className="btn-secondary justify-center touch-none"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IapToast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="fixed left-0 right-0 bottom-6 z-[70] flex justify-center px-4 pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto px-4 py-2 rounded-full text-sm font-semibold text-slate-900 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #E8C872, #C9A050)' }}
        onClick={onDismiss}
        role="status"
      >
        {message}
      </button>
    </div>
  );
}
