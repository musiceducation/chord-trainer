import { priceText } from './PaywallSheet.jsx';

function rowStyle() {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
}

export function IapSettings({
  isPro,
  trialActive = false,
  trialStarted = false,
  trialDaysLeft = 0,
  native,
  prices,
  priceStatus,
  busyId,
  notice,
  labels,
  onBuyPro,
  onBuySupport,
  onRestore,
}) {
  const busy = Boolean(busyId);
  const smallPrice = priceText({
    price: prices?.[labels.smallId],
    status: priceStatus,
    unavailableLabel: labels.priceUnavailable,
  });
  const largePrice = priceText({
    price: prices?.[labels.largeId],
    status: priceStatus,
    unavailableLabel: labels.priceUnavailable,
  });
  const proPrice = priceText({
    price: prices?.[labels.proId],
    status: priceStatus,
    unavailableLabel: labels.priceUnavailable,
  });

  const accessLabel = isPro
    ? labels.unlocked
    : trialActive
      ? (labels.trialActive || '').replace('{n}', String(trialDaysLeft))
      : null;

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
            {labels.buy}{native && proPrice ? ` · ${proPrice}` : ''}
          </button>
        )}
      </div>
      {!isPro && !trialActive && labels.trialOffer && (
        <p className="text-xs text-slate-400 mb-2 px-0.5">{labels.trialOffer}</p>
      )}
      {!isPro && trialStarted && !trialActive && labels.trialEnded && (
        <p className="text-xs text-slate-500 mb-2 px-0.5">{labels.trialEnded}</p>
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
        <button
          type="button"
          className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl text-left touch-none active:scale-[0.98] disabled:opacity-60"
          style={rowStyle()}
          disabled={busy || !native}
          onClick={() => onBuySupport(labels.largeId)}
        >
          <span className="text-sm font-semibold text-slate-100">{labels.supportLarge}</span>
          <span className="mono-font text-sm font-bold text-amber-200 shrink-0">
            {native ? (busyId === labels.largeId ? '…' : largePrice) : ''}
          </span>
        </button>
      </div>
      {notice && notice !== labels.unavailable && (
        <p className="text-xs text-slate-400 mt-2" role="status">{notice}</p>
      )}
    </div>
  );
}
