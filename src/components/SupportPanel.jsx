import { Heart } from 'lucide-react';
import { useIap } from '../hooks/useIap.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function SupportPanel() {
  const { t } = useI18n();
  const { products, ready, busyId, status, buy } = useIap();

  const statusText = status === 'thanks'
    ? t('support.thanks')
    : status === 'unavailable'
    ? t('support.unavailable')
    : status === 'web'
    ? t('support.webOnly')
    : status === 'error'
    ? t('support.error')
    : status === 'loading'
    ? t('support.loading')
    : t('support.blurb');

  return (
    <div className="mt-3.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">
        {t('settings.support')}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-2.5">{statusText}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {products.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!ready || Boolean(busyId)}
            onClick={() => buy(item.id)}
            className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,130,0.16), rgba(255,215,130,0.05))',
              border: '1px solid rgba(255,215,130,0.28)',
              color: '#F0D080',
              fontWeight: 700,
            }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Heart size={12} aria-hidden="true" />
              <span>{busyId === item.id ? t('support.processing') : item.price}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
