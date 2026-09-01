import { useState, useCallback } from 'react';
import {
  Volume2, VolumeX, Flame, Settings, Sparkles, Headphones, BarChart3,
} from 'lucide-react';
import { TestMode } from './components/TestMode.jsx';
import { EarMode } from './components/EarMode.jsx';
import { StatsMode } from './components/StatsMode.jsx';
import { DIFFICULTY_LEVELS, TABS } from './lib/constants.js';
import { loadStats, saveStats } from './lib/stats.js';

const TAB_ICONS = {
  test: Sparkles,
  ear: Headphones,
  stats: BarChart3,
};

export default function App() {
  const [tab, setTab] = useState('test');
  const [difficulty, setDifficulty] = useState('basic');
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStatsState] = useState(() => loadStats());
  const [scoreInfo, setScoreInfo] = useState({ streak: 0, correct: 0, total: 0 });

  const setStats = useCallback((updater) => {
    setStatsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStats(next);
      return next;
    });
  }, []);

  const sessionAccuracy = scoreInfo.total > 0
    ? Math.round((scoreInfo.correct / scoreInfo.total) * 100)
    : 0;

  const changeDifficulty = (d) => {
    setDifficulty(d);
    setShowSettings(false);
  };

  return (
    <div lang="zh-Hant" className="app-shell w-full text-slate-200 select-none relative overflow-hidden bg-[#070912]">
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full ambient-glow float-orb pointer-events-none ambient-orb"
        style={{
          background: tab === 'ear'
            ? 'radial-gradient(circle, rgba(122,220,200,0.18) 0%, transparent 70%)'
            : tab === 'stats'
            ? 'radial-gradient(circle, rgba(255,215,130,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(122,162,247,0.18) 0%, transparent 70%)',
          transition: 'background 0.8s',
        }}
      />
      <div
        className="absolute bottom-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full ambient-glow float-orb pointer-events-none ambient-orb-secondary"
        style={{
          background: 'radial-gradient(circle, rgba(187,154,247,0.15) 0%, transparent 70%)',
          animationDelay: '2s',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-5 py-3 flex flex-col app-main z-10">
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="chip flex items-center gap-1.5 px-3 py-1.5 rounded-full" title="本輪連勝">
              <Flame size={12} className="text-orange-400" aria-hidden="true" />
              <span className="font-bold mono-font text-sm text-slate-100">{scoreInfo.streak}</span>
              <span className="text-slate-600 text-xs mono-font">/ {stats.bestStreak}</span>
            </div>
            <div className="chip flex items-center gap-1.5 px-3 py-1.5 rounded-full" title="本輪正確率">
              <Sparkles size={12} className="text-purple-300" aria-hidden="true" />
              <span className="font-bold mono-font text-sm text-slate-100">
                {sessionAccuracy}<span className="text-xs text-slate-500">%</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={soundOn ? '關閉音效' : '開啟音效'}
              aria-pressed={soundOn}
              onClick={() => setSoundOn((s) => !s)}
              className="chip p-2 rounded-full transition active:scale-95 touch-none"
            >
              {soundOn ? <Volume2 size={13} className="text-slate-300" /> : <VolumeX size={13} className="text-slate-600" />}
            </button>
            <button
              type="button"
              aria-label="難度設定"
              aria-pressed={showSettings}
              onClick={() => setShowSettings((s) => !s)}
              className="chip p-2 rounded-full transition active:scale-95 touch-none"
              style={{
                background: showSettings ? 'rgba(122, 162, 247, 0.15)' : undefined,
                borderColor: showSettings ? 'rgba(122, 162, 247, 0.4)' : undefined,
              }}
            >
              <Settings size={13} className={showSettings ? 'text-blue-300' : 'text-slate-300'} />
            </button>
          </div>
        </header>

        <nav aria-label="主要分頁" className="flex gap-1.5 mb-3 p-1 rounded-2xl panel-soft">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = TAB_ICONS[t.key];
            return (
              <button
                key={t.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => { setTab(t.key); setShowSettings(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all touch-none active:scale-[0.98]"
                style={{
                  background: active ? `linear-gradient(135deg, ${t.accent.replace('0.4', '0.18')}, ${t.accent.replace('0.4', '0.06')})` : 'transparent',
                  border: `1px solid ${active ? t.accent : 'transparent'}`,
                  color: active ? '#F0F4FF' : '#565F89',
                  boxShadow: active ? `0 4px 16px ${t.accent.replace('0.4', '0.15')}` : 'none',
                }}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{t.name}</span>
              </button>
            );
          })}
        </nav>

        {showSettings && tab !== 'stats' && (
          <section aria-label="難度設定" className="mb-3 p-3 rounded-2xl chord-name panel-solid relative z-20">
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">Difficulty</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(DIFFICULTY_LEVELS).map(([key, val]) => {
                const active = difficulty === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeDifficulty(key)}
                    className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(122,162,247,0.25), rgba(122,162,247,0.1))'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(122,162,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
                      color: active ? '#C0CAF5' : '#565F89',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <div>{val.name}</div>
                    <div className="text-[9px] tracking-wider mt-0.5 opacity-60">{val.en}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <main className="flex flex-col flex-1 min-h-0">
          <TestMode
            difficulty={difficulty}
            soundOn={soundOn}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'test'}
          />
          <EarMode
            difficulty={difficulty}
            soundOn={soundOn}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'ear'}
          />
          <StatsMode stats={stats} setStats={setStats} hidden={tab !== 'stats'} />
        </main>
      </div>
    </div>
  );
}
