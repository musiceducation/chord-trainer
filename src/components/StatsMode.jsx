import { useMemo, useState } from 'react';
import {
  Check, BarChart3, Flame, Headphones, AlertTriangle, Trophy, Trash2,
} from 'lucide-react';
import { StatCard } from './StatCard.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { ACHIEVEMENTS } from '../lib/constants.js';
import { formatChord } from '../lib/chords.js';
import { computeAccuracy, DEFAULT_STATS, getWeakestChords } from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function StatsMode({ stats, setStats, hidden }) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const accuracy = computeAccuracy(stats);

  const weakChords = useMemo(() => getWeakestChords(stats), [stats]);

  const reset = () => {
    setStats({ ...DEFAULT_STATS });
    setConfirmOpen(false);
  };

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon={<Check size={14} className="text-emerald-300" />} label={t('stats.totalCorrect')} value={stats.totalCorrect} accent="emerald" />
          <StatCard icon={<BarChart3 size={14} className="text-blue-300" />} label={t('stats.accuracy')} value={`${accuracy}%`} accent="blue" />
          <StatCard icon={<Flame size={14} className="text-orange-300" />} label={t('stats.bestStreak')} value={stats.bestStreak} accent="orange" />
          <StatCard icon={<Headphones size={14} className="text-purple-300" />} label={t('stats.earCorrect')} value={stats.earCorrect || 0} accent="purple" />
        </div>

        <div className="mb-4 p-4 rounded-2xl panel-soft border-rose/15">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose-300" aria-hidden="true" />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-semibold">{t('stats.weakest')}</span>
          </div>
          {weakChords.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">{t('stats.keepPracticing')}</div>
          ) : (
            <div className="space-y-2">
              {weakChords.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="display-font text-base font-bold text-slate-200 w-20">{formatChord(c.name)}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.rate * 100}%`,
                        background: c.rate < 0.5
                          ? 'linear-gradient(90deg, #F7768E, #c44e64)'
                          : c.rate < 0.75
                          ? 'linear-gradient(90deg, #F0D080, #C9A050)'
                          : 'linear-gradient(90deg, #7ADCC8, #4FB8A0)',
                      }}
                    />
                  </div>
                  <div className="text-xs tabular-nums text-slate-400 w-14 text-right">
                    {Math.round(c.rate * 100)}% <span className="text-slate-600">({c.total})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 p-4 rounded-2xl panel-soft border-amber/15">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-amber-300" aria-hidden="true" />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-semibold">{t('stats.achievements')}</span>
            <span className="text-[10px] text-slate-500 ml-auto">
              {(stats.achievements || []).length} / {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = (stats.achievements || []).includes(a.id);
              return (
                <div
                  key={a.id}
                  className="p-2.5 rounded-xl"
                  style={{
                    background: unlocked
                      ? 'linear-gradient(135deg, rgba(255,215,130,0.12), rgba(255,215,130,0.04))'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${unlocked ? 'rgba(255,215,130,0.3)' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy size={11} className={unlocked ? 'text-amber-300' : 'text-slate-700'} aria-hidden="true" />
                    <span className={`text-xs font-semibold ${unlocked ? 'text-amber-200' : 'text-slate-600'}`}>
                      {t(`achievements.${a.id}.name`)}
                    </span>
                  </div>
                  <div className={`text-[10px] ${unlocked ? 'text-slate-400' : 'text-slate-700'}`}>
                    {t(`achievements.${a.id}.desc`)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center pb-2 safe-bottom">
          <button type="button" onClick={() => setConfirmOpen(true)} className="btn-action btn-danger-soft touch-none">
            <Trash2 size={13} className="text-rose-300" aria-hidden="true" />
            <span className="text-xs text-rose-200 tracking-wider uppercase font-medium">{t('stats.reset')}</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('stats.resetTitle')}
        message={t('stats.resetMessage')}
        confirmLabel={t('stats.resetConfirm')}
        cancelLabel={t('stats.resetCancel')}
        closeLabel={t('dialog.close')}
        onConfirm={reset}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
