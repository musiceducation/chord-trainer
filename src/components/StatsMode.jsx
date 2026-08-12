import { useMemo, useState } from 'react';
import {
  Check, BarChart3, Flame, Headphones, AlertTriangle, Trophy, Trash2,
} from 'lucide-react';
import { StatCard } from './StatCard.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { ACHIEVEMENTS } from '../lib/constants.js';
import { formatChord } from '../lib/chords.js';
import { computeAccuracy, DEFAULT_STATS } from '../lib/stats.js';

export function StatsMode({ stats, setStats, hidden }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const accuracy = computeAccuracy(stats);

  const weakChords = useMemo(() => {
    return Object.entries(stats.chordHistory || {})
      .map(([name, h]) => ({
        name,
        correct: h.correct || 0,
        wrong: h.wrong || 0,
        total: (h.correct || 0) + (h.wrong || 0),
        rate: ((h.correct || 0) + (h.wrong || 0)) > 0
          ? (h.correct || 0) / ((h.correct || 0) + (h.wrong || 0))
          : 1,
      }))
      .filter((c) => c.total >= 3)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [stats.chordHistory]);

  const reset = () => {
    setStats({ ...DEFAULT_STATS });
    setConfirmOpen(false);
  };

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon={<Check size={14} className="text-emerald-300" />} label="總答對" value={stats.totalCorrect} accent="emerald" />
          <StatCard icon={<BarChart3 size={14} className="text-blue-300" />} label="正確率" value={`${accuracy}%`} accent="blue" />
          <StatCard icon={<Flame size={14} className="text-orange-300" />} label="最高連勝" value={stats.bestStreak} accent="orange" />
          <StatCard icon={<Headphones size={14} className="text-purple-300" />} label="聽音答對" value={stats.earCorrect || 0} accent="purple" />
        </div>

        <div className="mb-4 p-4 rounded-2xl panel-soft border-rose/15">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose-300" aria-hidden="true" />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-semibold">最弱的和弦</span>
          </div>
          {weakChords.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">繼續練習以解鎖數據分析</div>
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
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-semibold">成就</span>
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
                      {a.name}
                    </span>
                  </div>
                  <div className={`text-[10px] ${unlocked ? 'text-slate-400' : 'text-slate-700'}`}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center pb-2 safe-bottom">
          <button type="button" onClick={() => setConfirmOpen(true)} className="btn-action btn-danger-soft touch-none">
            <Trash2 size={13} className="text-rose-300" aria-hidden="true" />
            <span className="text-xs text-rose-200 tracking-wider uppercase font-medium">重設統計</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="重設統計"
        message="確定要重設所有統計數據？此操作無法復原。"
        confirmLabel="重設"
        cancelLabel="取消"
        onConfirm={reset}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
