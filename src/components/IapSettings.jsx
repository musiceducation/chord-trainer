import { priceText } from './PaywallSheet.jsx';

function rowStyle() {
  return {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
  };
}

export function IapSettings({
  isPro,
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
  const busy = Boolean(busyId);

  return (
    <div className="mt-3.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">
        {labels.proName}
      </div>
      {!native && (
        <p className="text-xs text-slate-400 mb-2.5" role="status">{labels.unavailable}</p>
      )}
      <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl mb-1.5" style={rowStyle()}>
        <span className="text-sm font-semibold text-slate-100">{labels.proName}</span>
        {isPro ? (
          <span className="text-xs font-semibold text-emerald-300">{labels.unlocked}</span>
        ) : (
          <button
            type="button"
            className="text-xs font-semibold text-amber-200 touch-none disabled:opacity-60"
            disabled={busy}
            onClick={onBuyPro}
          >
            {labels.buy}
          </button>
        )}
      </div>
      <button
        type="button"
        className="w-full py-2.5 rounded-xl text-sm text-slate-200 touch-none active:scale-[0.98] disabled:opacity-60"
        style={rowStyle()}
        disabled={busy}
        onClick={onRestore}
      >
        {labels.restore}
      </button>

      <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3.5 mb-1.5 font-semibold">
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
