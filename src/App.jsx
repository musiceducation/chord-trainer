import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Volume2, VolumeX, Flame, Settings, Sparkles, Headphones, BarChart3, ListMusic,
} from 'lucide-react';
import { TestMode } from './components/TestMode.jsx';
import { EarMode } from './components/EarMode.jsx';
import { ProgressionEarMode } from './components/ProgressionEarMode.jsx';
import { StatsMode } from './components/StatsMode.jsx';
import { GuideOverlay } from './components/GuideOverlay.jsx';
import { DIFFICULTY_LEVELS, TABS } from './lib/constants.js';
import { TRAINING_KEYS } from './lib/diatonic.js';
import { loadStats, saveStats } from './lib/stats.js';
import { loadSettings, saveSettings } from './lib/settings.js';
import { LANGUAGES, htmlLangFor } from './lib/i18n.js';
import { useI18n } from './hooks/useI18n.jsx';
import { SupportPanel } from './components/SupportPanel.jsx';
import { readShotConfig } from './lib/shotMode.js';
import {
  BEGINNER_PACK,
  ONBOARDING_STEPS,
  earPracticeSpec,
  identifyPracticeSpec,
  initialGuideState,
  isGuideOverlayStep,
  isOnboardingPractice,
  tabForPackIndex,
  tabsLocked,
} from './lib/onboarding.js';

const TAB_ICONS = {
  test: Sparkles,
  ear: Headphones,
  progression: ListMusic,
  stats: BarChart3,
};

function settingButtonStyle(active) {
  return {
    background: active
      ? 'linear-gradient(135deg, rgba(122,162,247,0.25), rgba(122,162,247,0.1))'
      : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(122,162,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#C0CAF5' : '#565F89',
    fontWeight: active ? 700 : 500,
  };
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const shot = readShotConfig();
  const shotActive = Boolean(shot);
  const [tab, setTab] = useState(shot?.tab || 'test');
  const [settings, setSettingsState] = useState(() => loadSettings());
  const difficulty = settings.difficulty;
  const keyRoot = settings.keyRoot;
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(Boolean(shot?.settings));
  const [stats, setStatsState] = useState(() => loadStats());
  const [scoreInfo, setScoreInfo] = useState({ streak: 0, correct: 0, total: 0 });
  const [guide, setGuide] = useState(() => initialGuideState(loadSettings().onboardingDone, { shotActive }));
  const guideRef = useRef(guide);

  useEffect(() => { guideRef.current = guide; }, [guide]);

  const setStats = useCallback((updater) => {
    setStatsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStats(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const markHintUsed = useCallback((mode) => {
    setSettingsState((prev) => {
      const next = {
        ...prev,
        firstHintUsed: { ...prev.firstHintUsed, [mode]: true },
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const finishOnboarding = useCallback(() => {
    updateSettings({ onboardingDone: true });
    setGuide(null);
    setTab('test');
    setShowSettings(false);
  }, [updateSettings]);

  const skipOnboarding = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  const startOnboardingIdentify = useCallback(() => {
    setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.IDENTIFY });
    setTab('test');
    setShowSettings(false);
  }, []);

  const startOnboardingTrain = useCallback(() => {
    setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.TRAIN });
    setTab('ear');
    setShowSettings(false);
  }, []);

  const replayOnboarding = useCallback(() => {
    updateSettings({ onboardingDone: false });
    setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.WELCOME });
    setTab('test');
    setShowSettings(false);
  }, [updateSettings]);

  const startBeginnerPack = useCallback(() => {
    setGuide({ kind: 'pack', index: 0 });
    setTab(tabForPackIndex(0));
    setShowSettings(false);
  }, []);

  const exitPack = useCallback(() => {
    setGuide(null);
    setTab('test');
  }, []);

  const handlePracticeComplete = useCallback(() => {
    const current = guideRef.current;
    if (current?.kind === 'onboarding' && current.step === ONBOARDING_STEPS.IDENTIFY) {
      setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.CELEBRATE });
      return;
    }
    if (current?.kind === 'onboarding' && current.step === ONBOARDING_STEPS.TRAIN) {
      setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.PERFECT });
      return;
    }
    if (current?.kind === 'pack') {
      const next = current.index + 1;
      if (next >= BEGINNER_PACK.length) {
        setGuide({ kind: 'packDone' });
        return;
      }
      setGuide({ kind: 'pack', index: next });
      setTab(tabForPackIndex(next));
    }
  }, []);

  const sessionAccuracy = scoreInfo.total > 0
    ? Math.round((scoreInfo.correct / scoreInfo.total) * 100)
    : 0;

  const changeDifficulty = (d) => {
    updateSettings({ difficulty: d });
    setShowSettings(false);
  };

  const identifySpec = identifyPracticeSpec(guide);
  const earSpec = earPracticeSpec(guide);
  const lockTabs = tabsLocked(guide);
  const overlayOpen = isGuideOverlayStep(guide);
  const firstHintReady = !guide && !shotActive;

  let overlayTitle = '';
  let overlayLead = '';
  let overlayItems;
  let overlayCta = '';
  let overlayOnCta = finishOnboarding;
  let overlaySkip = skipOnboarding;
  let overlaySecondary;
  let overlaySecondaryOn;

  if (guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.WELCOME) {
    overlayTitle = t('onboarding.welcomeTitle');
    overlayLead = t('onboarding.welcomeLead');
    overlayItems = [t('onboarding.styleIdentify'), t('onboarding.styleTrain')];
    overlayCta = t('onboarding.start');
    overlayOnCta = startOnboardingIdentify;
  } else if (guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.CELEBRATE) {
    overlayTitle = t('onboarding.celebrateTitle');
    overlayLead = t('onboarding.celebrateBody');
    overlayCta = t('onboarding.nextTrain');
    overlayOnCta = startOnboardingTrain;
  } else if (guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.PERFECT) {
    overlayTitle = t('onboarding.perfectTitle');
    overlayLead = t('onboarding.perfectBody');
    overlayCta = t('onboarding.perfectCta');
    overlayOnCta = finishOnboarding;
    overlaySkip = null;
  } else if (guide?.kind === 'packDone') {
    overlayTitle = t('pack.doneTitle');
    overlayLead = t('pack.doneBody');
    overlayCta = t('pack.done');
    overlayOnCta = exitPack;
    overlaySkip = null;
    overlaySecondary = t('pack.replay');
    overlaySecondaryOn = startBeginnerPack;
  }

  const coachLine = isOnboardingPractice(guide)
    ? (guide.step === ONBOARDING_STEPS.IDENTIFY ? t('onboarding.identifyCoach') : t('onboarding.trainCoach'))
    : guide?.kind === 'pack'
      ? `${t('pack.name')} · ${t('pack.progress', { n: guide.index + 1 })}`
      : t(`guide.oneLiner.${tab}`);

  return (
    <div lang={htmlLangFor(lang)} className="app-shell w-full text-slate-200 select-none relative overflow-hidden bg-[#070912]">
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
            <div className="chip flex items-center gap-1.5 px-3 py-1.5 rounded-full" title={t('session.streak')}>
              <Flame size={12} className="text-orange-400" aria-hidden="true" />
              <span className="font-bold mono-font text-sm text-slate-100">{scoreInfo.streak}</span>
              <span className="text-slate-600 text-xs mono-font">/ {stats.bestStreak}</span>
            </div>
            <div className="chip flex items-center gap-1.5 px-3 py-1.5 rounded-full" title={t('session.accuracy')}>
              <Sparkles size={12} className="text-purple-300" aria-hidden="true" />
              <span className="font-bold mono-font text-sm text-slate-100">
                {sessionAccuracy}<span className="text-xs text-slate-500">%</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={soundOn ? t('sound.mute') : t('sound.unmute')}
              aria-pressed={soundOn}
              onClick={() => setSoundOn((s) => !s)}
              className="chip p-2 rounded-full transition active:scale-95 touch-none"
            >
              {soundOn ? <Volume2 size={13} className="text-slate-300" /> : <VolumeX size={13} className="text-slate-600" />}
            </button>
            <button
              type="button"
              aria-label={t('settings.aria')}
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

        <nav aria-label={t('nav.main')} className="flex gap-1.5 mb-3 p-1 rounded-2xl panel-soft">
          {TABS.map((item) => {
            const active = tab === item.key;
            const Icon = TAB_ICONS[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                disabled={lockTabs}
                onClick={() => { setTab(item.key); setShowSettings(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all touch-none active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: active ? `linear-gradient(135deg, ${item.accent.replace('0.4', '0.18')}, ${item.accent.replace('0.4', '0.06')})` : 'transparent',
                  border: `1px solid ${active ? item.accent : 'transparent'}`,
                  color: active ? '#F0F4FF' : '#565F89',
                  boxShadow: active ? `0 4px 16px ${item.accent.replace('0.4', '0.15')}` : 'none',
                }}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{t(`tab.${item.key}`)}</span>
              </button>
            );
          })}
        </nav>

        {!overlayOpen && (
          <div className="flex items-center gap-2 mb-3">
            <p className="mode-coach flex-1 min-w-0">{coachLine}</p>
            {isOnboardingPractice(guide) && (
              <button type="button" className="guide-skip-inline touch-none" onClick={skipOnboarding}>
                {t('onboarding.skip')}
              </button>
            )}
            {guide?.kind === 'pack' && (
              <button type="button" className="guide-skip-inline touch-none" onClick={exitPack}>
                {t('pack.exit')}
              </button>
            )}
            {!guide && (
              <button type="button" className="pack-pill touch-none active:scale-[0.98]" onClick={startBeginnerPack}>
                {t('pack.name')}
              </button>
            )}
          </div>
        )}

        {showSettings && (
          <section aria-label={t('settings.aria')} className="mb-3 p-3 rounded-2xl chord-name panel-solid relative z-20">
            {tab !== 'stats' && (
              <>
                <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">{t('settings.difficulty')}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.keys(DIFFICULTY_LEVELS).map((key) => {
                    const active = difficulty === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => changeDifficulty(key)}
                        className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                        style={settingButtonStyle(active)}
                      >
                        {t(`difficulty.${key}`)}
                      </button>
                    );
                  })}
                </div>
                {tab === 'progression' && (
                  <>
                    <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3.5 mb-2.5 font-semibold">{t('settings.key')}</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TRAINING_KEYS.map((key) => {
                        const active = keyRoot === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { updateSettings({ keyRoot: key }); setShowSettings(false); }}
                            className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                            style={settingButtonStyle(active)}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
            <div className={`text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold ${tab !== 'stats' ? 'mt-3.5' : ''}`}>
              {t('settings.language')}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {LANGUAGES.map((item) => {
                const active = lang === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    lang={item.htmlLang}
                    aria-pressed={active}
                    onClick={() => setLang(item.id)}
                    className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                    style={settingButtonStyle(active)}
                  >
                    {item.nativeLabel}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3.5 mb-2.5 font-semibold">
              {t('settings.beginner')}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={replayOnboarding}
                className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                style={settingButtonStyle(false)}
              >
                {t('onboarding.replay')}
              </button>
              <button
                type="button"
                onClick={startBeginnerPack}
                className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                style={settingButtonStyle(false)}
              >
                {t('pack.start')}
              </button>
            </div>
            <SupportPanel />
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
            tutorial={Boolean(identifySpec)}
            fixedQuestion={identifySpec}
            onQuestionComplete={identifySpec ? handlePracticeComplete : undefined}
            hideSkip={Boolean(identifySpec)}
            forceSequentialHint={guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.IDENTIFY}
            autoHint={firstHintReady && !settings.firstHintUsed.identify}
            onAutoHintUsed={() => markHintUsed('identify')}
          />
          <EarMode
            difficulty={difficulty}
            soundOn={soundOn}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'ear'}
            tutorial={Boolean(earSpec)}
            fixedQuestion={earSpec}
            onQuestionComplete={earSpec ? handlePracticeComplete : undefined}
            hideSkip={Boolean(earSpec)}
            autoPlayOnce={Boolean(earSpec)}
            hintAfterListen={guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.TRAIN}
            autoHint={firstHintReady && !settings.firstHintUsed.ear}
            onAutoHintUsed={() => markHintUsed('ear')}
          />
          <ProgressionEarMode
            difficulty={difficulty}
            keyRoot={keyRoot}
            soundOn={soundOn}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'progression'}
            autoHint={firstHintReady && !settings.firstHintUsed.progress}
            onAutoHintUsed={() => markHintUsed('progress')}
          />
          <StatsMode stats={stats} setStats={setStats} hidden={tab !== 'stats'} />
        </main>
      </div>

      <GuideOverlay
        open={overlayOpen}
        title={overlayTitle}
        lead={overlayLead}
        items={overlayItems}
        ctaLabel={overlayCta}
        onCta={overlayOnCta}
        onSkip={overlaySkip}
        skipLabel={t('onboarding.skip')}
        secondaryLabel={overlaySecondary}
        onSecondary={overlaySecondaryOn}
      />
    </div>
  );
}
