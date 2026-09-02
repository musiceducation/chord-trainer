import { useEffect, useState } from 'react';
import { Coffee, Heart, RotateCcw } from 'lucide-react';
import {
  TIP_COPY,
  TIP_TIERS,
  loadTipProducts as defaultLoadTipProducts,
  purchaseTip as defaultPurchaseTip,
  restoreTips as defaultRestoreTips,
  isNativeStorefront as defaultIsNativeStorefront,
} from '../lib/iap.js';

const TIER_ICONS = {
  lemonTea: Heart,
  coffee: Coffee,
};

export function TipJar({
  open,
  onClose,
  loadTipProducts = defaultLoadTipProducts,
  purchaseTip = defaultPurchaseTip,
  restoreTips = defaultRestoreTips,
  isNativeStorefront = defaultIsNativeStorefront,
}) {
  const [products, setProducts] = useState(() => (
    TIP_TIERS.map((tier) => ({ ...tier, priceString: tier.fallbackPrice }))
  ));
  const [busyId, setBusyId] = useState(null);
  const [thankYou, setThankYou] = useState(false);
  const [notice, setNotice] = useState('');
  const native = isNativeStorefront();

  useEffect(() => {
    if (!open) {
      setThankYou(false);
      setNotice('');
      setBusyId(null);
      return undefined;
    }

    let cancelled = false;
    loadTipProducts().then((next) => {
      if (!cancelled && Array.isArray(next) && next.length) setProducts(next);
    });
    return () => { cancelled = true; };
  }, [open, loadTipProducts]);

  if (!open) return null;

  const busy = busyId != null;

  const onPurchase = async (productId) => {
    if (busy) return;
    setNotice('');
    setBusyId(productId);
    try {
      const result = await purchaseTip(productId);
      if (result?.ok) {
        setThankYou(true);
      } else if (result?.reason !== 'cancelled') {
        setNotice(TIP_COPY.purchaseFailed);
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setNotice('');
    setBusyId('restore');
    try {
      const result = await restoreTips();
      setNotice(result?.message || TIP_COPY.restoreNothing);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tip-jar-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="關閉"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl p-5 panel-solid chord-name">
        {thankYou ? (
          <div className="py-8 text-center">
            <Heart size={28} className="mx-auto mb-3 text-rose-300" aria-hidden="true" />
            <p id="tip-jar-title" className="display-font text-3xl font-black text-slate-100 chord-success">
              {TIP_COPY.thankYou}
            </p>
            <button
              type="button"
              className="btn-secondary mt-6 touch-none"
              onClick={onClose}
            >
              關閉
            </button>
          </div>
        ) : (
          <>
            <h2 id="tip-jar-title" className="text-base font-semibold text-slate-100 mb-1">
              {TIP_COPY.title}
            </h2>
            <p className="text-sm text-slate-400 mb-4">{TIP_COPY.subtitle}</p>
            {!native && (
              <p className="text-[10px] text-slate-600 mb-3 tracking-wider">{TIP_COPY.webPreview}</p>
            )}
            <div className="grid gap-1.5 mb-3">
              {products.map((tier) => {
                const Icon = TIER_ICONS[tier.key] || Heart;
                const active = busyId === tier.productId;
                return (
                  <button
                    key={tier.productId}
                    type="button"
                    disabled={busy}
                    onClick={() => onPurchase(tier.productId)}
                    className="flex items-center justify-between gap-3 py-3 px-3.5 rounded-xl text-left transition-all touch-none active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(255,215,130,0.22), rgba(255,215,130,0.08))'
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(255,215,130,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="text-amber-300 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-semibold text-slate-100 truncate">{tier.label}</span>
                    </span>
                    <span className="mono-font text-sm font-bold text-amber-200 shrink-0">
                      {active ? '…' : tier.priceString}
                    </span>
                  </button>
                );
              })}
            </div>
            {notice && (
              <p className="text-xs text-slate-400 mb-3" role="status">{notice}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onRestore}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition touch-none disabled:opacity-60"
              >
                <RotateCcw size={12} aria-hidden="true" />
                {TIP_COPY.restore}
              </button>
              <button type="button" className="btn-secondary touch-none" onClick={onClose}>
                關閉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
