import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Volume2, VolumeX, Flame, Settings, Sparkles, Headphones, BarChart3, ListMusic, Lock, GraduationCap,
} from 'lucide-react';
import { TestMode } from './components/TestMode.jsx';
import { AbrsmMode } from './components/AbrsmMode.jsx';
import { EarMode } from './components/EarMode.jsx';
import { ProgressionEarMode } from './components/ProgressionEarMode.jsx';
import { StatsMode } from './components/StatsMode.jsx';
import { GuideOverlay } from './components/GuideOverlay.jsx';
import { DIFFICULTY_LEVELS, TABS } from './lib/constants.js';
import { TRAINING_KEYS } from './lib/diatonic.js';
import { loadStats, saveStats } from './lib/stats.js';
import { loadSettings, saveSettings } from './lib/settings.js';
import { applyFreeRampCap, canAccessProgression, PRODUCT_IDS } from './lib/entitlement.js';
import {
  DEFAULT_PIANO_SOUND,
  PIANO_SOUND_IDS,
  getPianoPack,
  normalizePianoSound,
} from './lib/pianoSamples.js';
import { setActivePianoSound } from './lib/pianoEngine.js';
import {
  advanceDrill,
  applyRoundToBook,
  buildMissRetryQuestions,
  drillCorrectCount,
  loadMissBook,
  saveMissBook,
} from './lib/drill.js';
import { LANGUAGES, htmlLangFor } from './lib/i18n.js';
import { useI18n } from './hooks/useI18n.jsx';
import { useIap } from './hooks/useIap.js';
import { IapSettings } from './components/IapSettings.jsx';
import { SoftReviewDialog } from './components/SoftReviewDialog.jsx';
import {
  isPositiveDrillResult,
  isStreakMilestone,
  loadReviewState,
  recordReviewRequested,
  recordSoftAnswer,
  saveReviewState,
  shouldOfferSoftGate,
} from './lib/reviewPrompt.js';
import { requestNativeReview } from './native/inAppReview.js';
import { IapToast, PaywallSheet } from './components/PaywallSheet.jsx';
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
  abrsm: GraduationCap,
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
  const [missBook, setMissBook] = useState(() => loadMissBook());
  const [drill, setDrill] = useState(null);
  const [drillPromptDismissed, setDrillPromptDismissed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewStateRef = useRef(loadReviewState());
  const reviewPromptedRef = useRef(false);
  const [rampLevel, setRampLevel] = useState(null);
  const [rampNudge, setRampNudge] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const iap = useIap();
  const proAccess = Boolean(iap.isPro);
  const practiceDifficulty = difficulty;
  const pianoSound = normalizePianoSound(settings.pianoSound || DEFAULT_PIANO_SOUND);
  const isProRef = useRef(proAccess);
  const guideRef = useRef(guide);
  const drillRef = useRef(null);
  const difficultyRef = useRef(difficulty);
  const missBookRef = useRef(missBook);
  const rampMissRef = useRef(0);

  useEffect(() => { guideRef.current = guide; }, [guide]);
  useEffect(() => { drillRef.current = drill; }, [drill]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { missBookRef.current = missBook; }, [missBook]);
  useEffect(() => { isProRef.current = proAccess; }, [proAccess]);
  useEffect(() => {
    if (!proAccess && tab === 'progression') setTab('test');
  }, [proAccess, tab]);
  useEffect(() => {
    setActivePianoSound(pianoSound);
  }, [pianoSound]);
  useEffect(() => {
    if (!rampLevel) return undefined;
    const timer = window.setTimeout(() => setRampLevel(null), 2500);
    return () => window.clearTimeout(timer);
  }, [rampLevel]);
  useEffect(() => {
    if (!rampNudge) return undefined;
    const timer = window.setTimeout(() => setRampNudge(false), 4000);
    return () => window.clearTimeout(timer);
  }, [rampNudge]);

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
    drillRef.current = null;
    setDrill(null);
    updateSettings({ onboardingDone: false });
    setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.IDENTIFY });
    setTab('test');
    setShowSettings(false);
  }, [updateSettings]);

  const startBeginnerPack = useCallback(() => {
    drillRef.current = null;
    setDrill(null);
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
      setGuide({ kind: 'onboarding', step: ONBOARDING_STEPS.TRAIN });
      setTab('ear');
      return;
    }
    if (current?.kind === 'onboarding' && current.step === ONBOARDING_STEPS.TRAIN) {
      finishOnboarding();
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
  }, [finishOnboarding]);

  const queueReviewPrompt = useCallback((reason) => {
    if (reviewPromptedRef.current || reviewOpen) return;
    if (!shouldOfferSoftGate({ state: reviewStateRef.current, reason })) return;
    reviewPromptedRef.current = true;
    const stamped = {
      ...reviewStateRef.current,
      lastSoftGateAt: new Date().toISOString(),
    };
    reviewStateRef.current = stamped;
    saveReviewState(stamped);
    setReviewOpen(true);
  }, [reviewOpen]);

  const handleQuestionComplete = useCallback((payload = {}) => {
    const currentDrill = drillRef.current;
    if (currentDrill && !currentDrill.done) {
      const next = advanceDrill(currentDrill, payload);
      drillRef.current = next;
      setDrill(next);
      if (!next.done) {
        const upcoming = next.questions[next.index];
        if (upcoming?.mode) setTab(upcoming.mode);
      } else {
        const correct = drillCorrectCount(next);
        if (isPositiveDrillResult(correct, next.questions.length)) {
          queueReviewPrompt('drillDone');
        }
      }
      return;
    }
    handlePracticeComplete();
  }, [handlePracticeComplete, queueReviewPrompt]);

  const handleRoundSettled = useCallback((payload) => {
    const guided = guideRef.current;
    const blockingGuide = guided?.kind === 'onboarding' || guided?.kind === 'pack' || guided?.kind === 'packDone';
    if (blockingGuide) return;

    if (payload?.question?.root) {
      setMissBook((prev) => {
        const next = applyRoundToBook(prev, payload.question, {
          missed: payload.missed,
          skipped: payload.skipped,
          at: new Date().toISOString(),
        });
        saveMissBook(next);
        missBookRef.current = next;
        return next;
      });
    }

    if (drillRef.current) return;
    if (payload?.skipped && !payload?.missed) return;

    const missed = Boolean(payload?.missed);
    const missStreak = missed ? rampMissRef.current + 1 : 0;
    const cleanStreak = missed ? 0 : (payload?.streak || 0);
    const current = difficultyRef.current;
    const { difficulty: next, nudge } = applyFreeRampCap({
      isPro: true,
      current,
      cleanStreak,
      missStreak,
    });
    if (nudge) setRampNudge(true);
    if (next !== current) {
      rampMissRef.current = 0;
      updateSettings({ difficulty: next });
      setRampLevel(next);
    } else {
      rampMissRef.current = missStreak;
    }

    if (!missed && isStreakMilestone(cleanStreak)) {
      queueReviewPrompt('streak');
    }
  }, [updateSettings, queueReviewPrompt]);

  const beginDrill = useCallback((session) => {
    if (!session?.questions?.length) return;
    drillRef.current = session;
    setDrill(session);
    setGuide(null);
    setShowSettings(false);
    setDrillPromptDismissed(true);
    const first = session.questions[Math.min(session.index || 0, session.questions.length - 1)];
    setTab(first.mode === 'test' ? 'test' : 'ear');
  }, []);


  const startRetry = useCallback(() => {
    const questions = buildMissRetryQuestions(missBookRef.current.items);
    if (!questions.length) return;
    beginDrill({
      kind: 'misses',
      questions,
      index: 0,
      results: [],
      done: false,
    });
  }, [beginDrill]);

  const exitDrill = useCallback(() => {
    drillRef.current = null;
    setDrill(null);
    setTab('test');
  }, []);

  const clearMissBook = useCallback(() => {
    const empty = { items: [] };
    missBookRef.current = empty;
    setMissBook(empty);
    saveMissBook(empty);
  }, []);

  const sessionAccuracy = scoreInfo.total > 0
    ? Math.round((scoreInfo.correct / scoreInfo.total) * 100)
    : 0;

  const changeDifficulty = (d) => {
    rampMissRef.current = 0;
    updateSettings({ difficulty: d });
    setShowSettings(false);
  };

  const changePianoSound = (id) => {
    updateSettings({ pianoSound: normalizePianoSound(id) });
  };

  const noticeText = {
    pending: t('iap.pending'),
    unavailable: t('iap.unavailable'),
    failed: t('iap.failed'),
    restoreFailed: t('iap.restoreFailed'),
    restoreNone: t('iap.restoreNone'),
  }[iap.notice] || '';

  const toastText = {
    thanks: t('iap.thanks'),
    restored: t('iap.restoreDone'),
  }[iap.toast] || '';

  const buyPro = async () => {
    const result = await iap.buy(PRODUCT_IDS.pro);
    if (result?.ok) setPaywallOpen(false);
  };

  const drillQuestion = drill && !drill.done ? drill.questions[drill.index] : null;
  const drillEpoch = drillQuestion
    ? `${drill.kind}:${drill.index}:${drillQuestion.root}:${drillQuestion.type}`
    : '';
  const identifyFromGuide = identifyPracticeSpec(guide);
  const earFromGuide = earPracticeSpec(guide);
  const identifySpec = drillQuestion?.mode === 'test' ? drillQuestion : identifyFromGuide;
  const earSpec = drillQuestion?.mode === 'ear' ? drillQuestion : earFromGuide;
  const guidedIdentify = Boolean(identifyFromGuide) && !drillQuestion;
  const guidedEar = Boolean(earFromGuide) && !drillQuestion;
  const lockTabs = tabsLocked(guide) || Boolean(drillQuestion);
  const drillDone = Boolean(drill?.done);
  const overlayOpen = isGuideOverlayStep(guide) || drillDone;
  const firstHintReady = !guide && !drill && !shotActive;
  const showMissPrompt = !guide && !drill && !drillPromptDismissed
    && tab !== 'stats'
    && tab !== 'abrsm'
    && missBook.items.length > 0;

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
  } else if (drillDone) {
    const correct = drillCorrectCount(drill);
    const total = drill.questions.length;
    overlayTitle = t('drill.retryDoneTitle');
    overlayLead = t('drill.doneBody', { correct, total });
    overlayCta = t('drill.doneClose');
    overlayOnCta = exitDrill;
    overlaySkip = null;
    if (missBook.items.length > 0) {
      overlaySecondary = t('drill.retryCount', { n: missBook.items.length });
      overlaySecondaryOn = startRetry;
    }
  }

  const drillCoach = drillQuestion
    ? t('drill.retryProgress', { n: drill.index + 1, total: drill.questions.length })
    : '';

  const guideTab = tab !== 'abrsm';
  let coachLine = !guideTab
    ? t('guide.oneLiner.abrsm')
    : isOnboardingPractice(guide)
    ? (guide.step === ONBOARDING_STEPS.IDENTIFY ? t('onboarding.identifyCoach') : t('onboarding.trainCoach'))
    : guide?.kind === 'pack'
      ? `${t('pack.name')} · ${t('pack.progress', { n: guide.index + 1 })}`
      : t(`guide.oneLiner.${tab}`);
  if (!guide && !drillQuestion && tab === 'test' && settings.identifyInversions && !guidedIdentify) {
    coachLine = t('identify.listenChoose');
  }

  const closeReviewGate = useCallback((answer) => {
    const answered = recordSoftAnswer(reviewStateRef.current, answer);
    reviewStateRef.current = answered;
    saveReviewState(answered);
    setReviewOpen(false);
  }, []);

  const acceptReviewGate = useCallback(async () => {
    closeReviewGate('yes');
    const result = await requestNativeReview();
    if (result.ok) {
      const next = recordReviewRequested(reviewStateRef.current);
      reviewStateRef.current = next;
      saveReviewState(next);
    }
  }, [closeReviewGate]);

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
            const locked = item.key === 'progression' && !canAccessProgression(proAccess);
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                disabled={lockTabs}
                onClick={() => {
                  if (locked) {
                    setPaywallOpen(true);
                    return;
                  }
                  setTab(item.key);
                  setShowSettings(false);
                }}
                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all touch-none active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: active ? `linear-gradient(135deg, ${item.accent.replace('0.4', '0.18')}, ${item.accent.replace('0.4', '0.06')})` : 'transparent',
                  border: `1px solid ${active ? item.accent : 'transparent'}`,
                  color: active ? '#F0F4FF' : '#565F89',
                  boxShadow: active ? `0 4px 16px ${item.accent.replace('0.4', '0.15')}` : 'none',
                }}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="flex items-center gap-0.5">
                  {t(`tab.${item.key}`)}
                  {locked && <Lock size={9} className="text-amber-300" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </nav>

        {!overlayOpen && (
          <div className="flex items-center gap-2 mb-3">
            <p className="mode-coach flex-1 min-w-0">{drillQuestion ? drillCoach : coachLine}</p>
            {guideTab && rampLevel && !drillQuestion && (
              <span className="guide-skip-inline">{t('ramp.now', { level: t(`difficulty.${rampLevel}`) })}</span>
            )}
            {guideTab && rampNudge && !drillQuestion && !proAccess && (
              <button
                type="button"
                className="guide-skip-inline touch-none"
                onClick={() => setPaywallOpen(true)}
              >
                {t('ramp.proNudge')}
              </button>
            )}
            {guideTab && isOnboardingPractice(guide) && !drillQuestion && (
              <button type="button" className="guide-skip-inline touch-none" onClick={skipOnboarding}>
                {t('onboarding.skip')}
              </button>
            )}
            {guideTab && guide?.kind === 'pack' && (
              <button type="button" className="guide-skip-inline touch-none" onClick={exitPack}>
                {t('pack.exit')}
              </button>
            )}
            {drillQuestion && (
              <button type="button" className="guide-skip-inline touch-none" onClick={exitDrill}>
                {t('drill.exit')}
              </button>
            )}
            {guideTab && !guide && !drillQuestion && (
              <button type="button" className="pack-pill touch-none active:scale-[0.98]" onClick={startBeginnerPack}>
                {t('pack.name')}
              </button>
            )}
          </div>
        )}

        {showMissPrompt && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button type="button" className="pack-pill touch-none active:scale-[0.98]" onClick={startRetry}>
              {t('drill.retryCount', { n: missBook.items.length })}
            </button>
            <button
              type="button"
              className="guide-skip-inline touch-none"
              aria-label={t('drill.dismiss')}
              onClick={() => setDrillPromptDismissed(true)}
            >
              {t('drill.dismiss')}
            </button>
          </div>
        )}

        {showSettings && (
          <section
            aria-label={t('settings.aria')}
            className="mb-3 p-3 rounded-2xl chord-name panel-solid relative z-20 max-h-[min(62dvh,560px)] overflow-y-auto overscroll-contain"
          >
            {tab !== 'stats' && tab !== 'abrsm' && (
              <>
                <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">{t('settings.difficulty')}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.keys(DIFFICULTY_LEVELS).map((key) => {
                    const active = practiceDifficulty === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => changeDifficulty(key)}
                        className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
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
            <div className={`text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold ${tab !== 'stats' && tab !== 'abrsm' ? 'mt-3.5' : ''}`}>
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
              {t('settings.answerSurface')}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {['keyboard', 'noteNames'].map((id) => {
                const active = settings.answerSurface === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ answerSurface: id })}
                    className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                    style={settingButtonStyle(active)}
                  >
                    {t(`settings.answer.${id}`)}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3.5 mb-2.5 font-semibold">
              {t('settings.pianoSound')}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PIANO_SOUND_IDS.map((id) => {
                const active = pianoSound === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changePianoSound(id)}
                    className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                    style={settingButtonStyle(active)}
                  >
                    {t(getPianoPack(id).labelKey)}
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
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3.5 mb-2.5 font-semibold">
              {t('about.section')}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-1 px-0.5">{t('about.pianoCreditAcoustic')}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-1 px-0.5">{t('about.pianoCreditElectric')}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-1 px-0.5">{t('about.pianoCreditElectricBright')}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-1 px-0.5">{t('about.pianoCreditOrgan')}</p>
            {!shot?.hideIap && (
              <IapSettings
                isPro={iap.isPro}
                trialActive={false}
                trialStarted={false}
                trialDaysLeft={0}
                native={iap.native}
                prices={iap.prices}
                priceStatus={iap.priceStatus}
                busyId={iap.busyId}
                notice={noticeText}
                labels={{
                  proName: t('pro.name'),
                  buy: t('pro.buy'),
                  unlocked: t('pro.unlocked'),
                  restore: t('pro.restore'),
                  unavailable: t('iap.unavailable'),
                  priceUnavailable: t('pro.priceUnavailable'),
                  trialActive: t('pro.trialActive'),
                  trialEnded: t('pro.trialEnded'),
                  trialOffer: t('pro.trialOffer'),
                  supportSection: t('support.section'),
                  supportDisclaimer: t('support.disclaimer'),
                  supportSmall: t('support.small'),
                  supportLarge: t('support.large'),
                  proId: PRODUCT_IDS.pro,
                  smallId: PRODUCT_IDS.supportSmall,
                  largeId: PRODUCT_IDS.supportLarge,
                }}
                onBuyPro={() => setPaywallOpen(true)}
                onBuySupport={(productId) => iap.buy(productId)}
                onRestore={iap.restore}
              />
            )}
          </section>
        )}

        <main className={`flex flex-col flex-1 min-h-0 ${overlayOpen ? 'invisible' : ''}`}>
          <TestMode
            difficulty={practiceDifficulty}
            soundOn={soundOn}
            pianoSound={pianoSound}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'test'}
            tutorial={guidedIdentify}
            fixedQuestion={identifySpec}
            questionEpoch={drillQuestion?.mode === 'test' ? drillEpoch : ''}
            onQuestionComplete={identifySpec ? handleQuestionComplete : undefined}
            onRoundSettled={handleRoundSettled}
            hideSkip={guidedIdentify}
            forceSequentialHint={guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.IDENTIFY}
            autoHint={firstHintReady && !settings.firstHintUsed.identify}
            onAutoHintUsed={() => markHintUsed('identify')}
            answerSurface={settings.answerSurface}
            inversions={settings.identifyInversions}
            onInversionsChange={(identifyInversions) => updateSettings({ identifyInversions })}
          />
          <EarMode
            difficulty={practiceDifficulty}
            soundOn={soundOn}
            pianoSound={pianoSound}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'ear'}
            tutorial={guidedEar}
            fixedQuestion={earSpec}
            questionEpoch={drillQuestion?.mode === 'ear' ? drillEpoch : ''}
            onQuestionComplete={earSpec ? handleQuestionComplete : undefined}
            onRoundSettled={handleRoundSettled}
            hideSkip={guidedEar}
            autoPlayOnce={Boolean(earSpec)}
            hintAfterListen={guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.TRAIN}
            autoHint={firstHintReady && !settings.firstHintUsed.ear}
            onAutoHintUsed={() => markHintUsed('ear')}
            answerSurface={settings.answerSurface}
          />
          <ProgressionEarMode
            difficulty={practiceDifficulty}
            keyRoot={keyRoot}
            soundOn={soundOn}
            pianoSound={pianoSound}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'progression' || !proAccess}
            autoHint={firstHintReady && !settings.firstHintUsed.progress}
            onAutoHintUsed={() => markHintUsed('progress')}
            onRoundSettled={handleRoundSettled}
          />
          <AbrsmMode
            soundOn={soundOn}
            pianoSound={pianoSound}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'abrsm'}
            answerSurface={settings.answerSurface}
            tier={settings.romanTier}
            onTierChange={(romanTier) => updateSettings({ romanTier })}
            inversions={settings.romanInversions}
            onInversionsChange={(romanInversions) => updateSettings({ romanInversions })}
          />
          <StatsMode
            stats={stats}
            setStats={setStats}
            hidden={tab !== 'stats'}
            missCount={missBook.items.length}
            onRetryMisses={startRetry}
            onResetMissBook={clearMissBook}
            fullStats={proAccess}
            sessionStreak={scoreInfo.streak}
            sessionAccuracy={sessionAccuracy}
            onUnlockPro={() => setPaywallOpen(true)}
          />
        </main>
      </div>

      <PaywallSheet
        open={paywallOpen}
        title={t('pro.paywallTitle')}
        body={t('pro.paywallBody')}
        trialOffer={iap.isPro ? null : t('pro.trialOffer')}
        price={iap.prices[PRODUCT_IDS.pro]}
        priceStatus={iap.priceStatus}
        unavailableLabel={t('pro.priceUnavailable')}
        storeUnavailableLabel={t('iap.unavailable')}
        native={iap.native}
        buyLabel={t('pro.buy')}
        restoreLabel={t('pro.restore')}
        closeLabel={t('dialog.close')}
        notice={noticeText}
        busy={iap.busyId === PRODUCT_IDS.pro || iap.busyId === 'restore'}
        onBuy={buyPro}
        onRestore={iap.restore}
        onClose={() => setPaywallOpen(false)}
      />
      <IapToast message={toastText} onDismiss={iap.clearToast} />

      <SoftReviewDialog
        open={reviewOpen}
        title={t('review.title')}
        message={t('review.body')}
        yesLabel={t('review.yes')}
        noLabel={t('review.no')}
        closeLabel={t('dialog.close')}
        onYes={acceptReviewGate}
        onNo={() => closeReviewGate('no')}
      />

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
