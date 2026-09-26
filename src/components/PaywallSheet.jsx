export function priceText({ price, status, unavailableLabel }) {
  if (price) return price;
  if (status === 'loading') return '…';
  return unavailableLabel;
}

export function PaywallSheet({
  open,
  title,
  body,
  price,
  priceStatus,
  unavailableLabel,
  storeUnavailableLabel,
  native,
  buyLabel,
  restoreLabel,
  closeLabel,
  notice,
  busy,
  onBuy,
  onRestore,
  onClose,
}) {
  if (!open) return null;
  const shownPrice = priceText({ price, status: priceStatus, unavailableLabel });

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
      <div className="relative w-full max-w-sm rounded-2xl p-5 panel-solid">
        <h2 id="paywall-title" className="text-base font-semibold text-slate-100 mb-1">{title}</h2>
        <p className="text-sm text-slate-400 mb-4">{body}</p>
        {!native && (
          <p className="text-sm text-slate-300 mb-4" role="status">{storeUnavailableLabel}</p>
        )}
        {native && (
          <p className="mono-font text-lg font-bold text-amber-200 mb-4" data-testid="paywall-price">
            {shownPrice}
          </p>
        )}
        {notice && notice !== storeUnavailableLabel && (
          <p className="text-xs text-slate-400 mb-3" role="status">{notice}</p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="py-2.5 rounded-xl text-sm font-semibold text-slate-900 touch-none active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #E8C872, #C9A050)' }}
            disabled={busy || !native}
            onClick={onBuy}
          >
            {busy ? '…' : buyLabel}
          </button>
          <button
            type="button"
            className="btn-secondary justify-center touch-none"
            disabled={busy}
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
