import { LegalLinks, priceText } from './PaywallSheet.jsx';

function rowStyle() {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
}

export function IapSettings({
  isPro = false,
  isAdFree = false,
  native,
  prices,
  priceStatus,
  busyId,
  notice,
  labels,
  onBuyPro,
  onBuySupport,
  onRestore,
  onAdPrivacy,
}) {
  const busy = Boolean(busyId);
  const unlocked = Boolean(isAdFree || isPro);
  const smallPrice = priceText({
    price: prices?.[labels.smallId],
    status: priceStatus,
    unavailableLabel: labels.priceUnavailable,
  });
  const adFreeStorePrice = prices?.[labels.adFreeId] || '';
  const adFreePrice = priceText({
    price: adFreeStorePrice,
    status: priceStatus,
    unavailableLabel: labels.priceUnavailable,
  });

  const accessLabel = unlocked ? labels.unlocked : null;

  return (
    <div className="mt-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">
        {labels.proName}
      </div>
      {!native && (
        <p className="text-xs text-slate-500 mb-2">{labels.unavailable}</p>
      )}
      <div
        className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl mb-1.5"
        style={rowStyle()}
      >
        <span className="text-sm font-semibold text-slate-100">{labels.proName}</span>
        {accessLabel ? (
          <span className="text-xs font-semibold text-emerald-300 text-right">{accessLabel}</span>
        ) : (
          <button
            type="button"
            className="text-xs font-semibold text-amber-200 touch-none active:scale-[0.98] disabled:opacity-50"
            disabled={busy || !native}
            onClick={onBuyPro}
          >
            {labels.buy}{native && adFreePrice ? ` · ${adFreePrice}` : ''}
          </button>
        )}
      </div>
      {labels.adFree && (
        <p className="text-xs font-semibold text-slate-200 mb-1 px-0.5" data-testid="settings-ad-free">
          {labels.adFree}
        </p>
      )}
      {labels.modesFree && (
        <p className="text-xs text-slate-400 mb-2 px-0.5" data-testid="settings-modes-free">
          {labels.modesFree}
        </p>
      )}
      <button
        type="button"
        className="w-full py-2.5 px-3 rounded-xl text-sm text-slate-300 touch-none active:scale-[0.98] disabled:opacity-50 mb-3"
        style={rowStyle()}
        disabled={busy || !native}
        onClick={onRestore}
      >
        {busyId === 'restore' ? '…' : labels.restore}
      </button>
      <LegalLinks
        privacyLabel={labels.privacy}
        termsLabel={labels.terms}
        className="mb-3"
      />
      {onAdPrivacy && (
        <button
          type="button"
          className="w-full py-2.5 px-3 rounded-xl text-sm text-slate-300 touch-none active:scale-[0.98] mb-3"
          style={rowStyle()}
          onClick={onAdPrivacy}
        >
          {labels.adPrivacy}
        </button>
      )}

      <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">
        {labels.supportSection}
      </div>
      <p className="text-xs text-slate-400 mb-2">{labels.supportDisclaimer}</p>
      <div className="grid gap-1.5">
        <button
          type="button"
          className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl text-left touch-none active:scale-[0.98] disabled:opacity-60"
          style={rowStyle()}
          disabled={busy || !native}
          onClick={() => onBuySupport(labels.smallId)}
        >
          <span className="text-sm font-semibold text-slate-100">{labels.supportSmall}</span>
          <span className="mono-font text-sm font-bold text-amber-200 shrink-0">
            {native ? (busyId === labels.smallId ? '…' : smallPrice) : ''}
          </span>
        </button>
      </div>
      {notice && notice !== labels.unavailable && (
        <p className="text-xs text-slate-400 mt-2" role="status">{notice}</p>
      )}
    </div>
  );
}
