import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Volume2, VolumeX, Flame, Settings, Sparkles, Headphones, Ear, BarChart3, ListMusic, Lock, GraduationCap, Search,
} from 'lucide-react';
import { TestMode } from './components/TestMode.jsx';
import { AbrsmMode } from './components/AbrsmMode.jsx';
import { EarMode } from './components/EarMode.jsx';
import { EarQualityMode } from './components/EarQualityMode.jsx';
import { LookupMode } from './components/LookupMode.jsx';
import { ProgressionEarMode } from './components/ProgressionEarMode.jsx';
import { StatsMode } from './components/StatsMode.jsx';
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
import { LANGUAGES, htmlLangFor } from './lib/i18n.js';
import { useI18n } from './hooks/useI18n.jsx';
import { useIap } from './hooks/useIap.js';
import { IapSettings } from './components/IapSettings.jsx';
import { SoftReviewDialog } from './components/SoftReviewDialog.jsx';
import {
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

const TAB_ICONS = {
  test: Sparkles,
  ear: Headphones,
  listen: Ear,
  progression: ListMusic,
  abrsm: GraduationCap,
  lookup: Search,
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
  const difficultyRef = useRef(difficulty);
  const rampMissRef = useRef(0);

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { isProRef.current = proAccess; }, [proAccess]);
  useEffect(() => {
    try {
      localStorage.removeItem('chordTrainerMissBook_v1');
    } catch {
      /* storage may be unavailable */
    }
  }, []);
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

  const handleRoundSettled = useCallback((payload) => {
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

  const sessionAccuracy = scoreInfo.total > 0
    ? Math.round((scoreInfo.correct / scoreInfo.total) * 100)
    : 0;

  const changeDifficulty = (d, { closeSettings = false } = {}) => {
    rampMissRef.current = 0;
    updateSettings({ difficulty: d });
    if (closeSettings) setShowSettings(false);
  };

  const changePianoSound = (id) => {
    updateSettings({ pianoSound: normalizePianoSound(id) });
  };

  const noticeText = {
    pending: t('iap.pending'),
    unavailable: t('iap.unavailable'),
    failed: t('iap.failed'),
    productUnavailable: t('iap.productUnavailable'),
    restoreFailed: t('iap.restoreFailed'),
    restoreNone: t('iap.restoreNone'),
  }[iap.notice] || '';

  const toastText = {
    thanks: t('iap.thanks'),
    restored: t('iap.restoreDone'),
  }[iap.toast] || '';

  const openPaywall = () => {
    setPaywallOpen(true);
    iap.reloadPrices();
  };

  const buyPro = async () => {
    const result = await iap.buy(PRODUCT_IDS.pro);
    if (result?.ok) setPaywallOpen(false);
  };

  const proStore = iap.products?.[PRODUCT_IDS.pro];
  const subscriptionTitle = proStore?.title || t('pro.subscriptionTitle');

  const firstHintReady = !shotActive;
  // Train has no persistent "Listen → play it back" subtitle.
  let coachLine = tab === 'ear' ? '' : t(`guide.oneLiner.${tab}`);
  if (tab === 'test' && settings.identifyInversions) {
    coachLine = t('identify.findRoot');
  }
  const showRampChip = Boolean(tab !== 'abrsm' && tab !== 'lookup' && rampLevel);
  const showNudgeChip = Boolean(tab !== 'abrsm' && tab !== 'lookup' && rampNudge && !proAccess);
  const showCoachRow = Boolean(coachLine || showRampChip || showNudgeChip);

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
          background: tab === 'ear' || tab === 'listen'
            ? 'radial-gradient(circle, rgba(122,220,200,0.18) 0%, transparent 70%)'
            : tab === 'lookup'
            ? 'radial-gradient(circle, rgba(240,208,128,0.16) 0%, transparent 70%)'
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

        <nav aria-label={t('nav.main')} className="flex gap-1.5 mb-3 p-1 rounded-2xl panel-soft overflow-x-auto">
          {TABS.map((item) => {
            const active = tab === item.key;
            const Icon = TAB_ICONS[item.key];
            const locked = item.key === 'progression' && !canAccessProgression(proAccess);
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (locked) {
                    openPaywall();
                    return;
                  }
                  setTab(item.key);
                  setShowSettings(false);
                }}
                className="flex-1 shrink-0 min-w-[3.35rem] flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-all touch-none active:scale-[0.98]"
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

        {showCoachRow && (
          <div className="flex items-center gap-2 mb-3">
            {coachLine ? <p className="mode-coach flex-1 min-w-0">{coachLine}</p> : <span className="flex-1" />}
            {showRampChip && (
              <span className="guide-skip-inline">{t('ramp.now', { level: t(`difficulty.${rampLevel}`) })}</span>
            )}
            {showNudgeChip && (
              <button
                type="button"
                className="guide-skip-inline touch-none"
                onClick={() => openPaywall()}
              >
                {t('ramp.proNudge')}
              </button>
            )}
          </div>
        )}

        {showSettings && (
          <section
            aria-label={t('settings.aria')}
            className="mb-3 p-3 rounded-2xl chord-name panel-solid relative z-20 max-h-[min(62dvh,560px)] overflow-y-auto overscroll-contain"
          >
            {tab === 'progression' && (
              <>
                <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">{t('settings.difficulty')}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.keys(DIFFICULTY_LEVELS).map((key) => {
                    const active = practiceDifficulty === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => changeDifficulty(key, { closeSettings: true })}
                        className="py-2.5 rounded-xl text-sm transition-all touch-none active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
                        style={settingButtonStyle(active)}
                      >
                        {t(`difficulty.${key}`)}
                      </button>
                    );
                  })}
                </div>
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
            <div className={`text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold ${tab === 'progression' ? 'mt-3.5' : ''}`}>
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
                  subscriptionTitle,
                  subscriptionLength: t('pro.subscriptionLength'),
                  pricePeriod: t('pro.pricePeriod'),
                  privacy: t('pro.privacy'),
                  terms: t('pro.terms'),
                  supportSection: t('support.section'),
                  supportDisclaimer: t('support.disclaimer'),
                  supportSmall: t('support.small'),
                  supportLarge: t('support.large'),
                  proId: PRODUCT_IDS.pro,
                  smallId: PRODUCT_IDS.supportSmall,
                  largeId: PRODUCT_IDS.supportLarge,
                }}
                onBuyPro={() => openPaywall()}
                onBuySupport={(productId) => iap.buy(productId)}
                onRestore={iap.restore}
              />
            )}
          </section>
        )}

        <main className="flex flex-col flex-1 min-h-0">
          <TestMode
            difficulty={practiceDifficulty}
            soundOn={soundOn}
            pianoSound={pianoSound}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'test'}
            onRoundSettled={handleRoundSettled}
            autoHint={firstHintReady && !settings.firstHintUsed.identify}
            onAutoHintUsed={() => markHintUsed('identify')}
            answerSurface={settings.answerSurface}
            inversions={settings.identifyInversions}
            onInversionsChange={(identifyInversions) => updateSettings({ identifyInversions })}
            onDifficultyChange={changeDifficulty}
          />
          <EarMode
            difficulty={practiceDifficulty}
            soundOn={soundOn}
            pianoSound={pianoSound}
            stats={stats}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'ear'}
            onRoundSettled={handleRoundSettled}
            autoHint={firstHintReady && !settings.firstHintUsed.ear}
            onAutoHintUsed={() => markHintUsed('ear')}
            answerSurface={settings.answerSurface}
            onDifficultyChange={changeDifficulty}
          />
          <EarQualityMode
            pool={settings.earQualityPool}
            onPoolChange={(earQualityPool) => updateSettings({ earQualityPool })}
            soundOn={soundOn}
            pianoSound={pianoSound}
            setStats={setStats}
            onScoreChange={setScoreInfo}
            hidden={tab !== 'listen'}
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
          <LookupMode
            soundOn={soundOn}
            pianoSound={pianoSound}
            hidden={tab !== 'lookup'}
          />
          <StatsMode
            stats={stats}
            setStats={setStats}
            hidden={tab !== 'stats'}
            fullStats={proAccess}
            sessionStreak={scoreInfo.streak}
            sessionAccuracy={sessionAccuracy}
            onUnlockPro={() => openPaywall()}
          />
        </main>
      </div>

      <PaywallSheet
        open={paywallOpen}
        title={t('pro.paywallTitle')}
        subscriptionTitle={subscriptionTitle}
        subscriptionLength={t('pro.subscriptionLength')}
        pricePeriod={t('pro.pricePeriod')}
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
        retryLabel={t('iap.retry')}
        privacyLabel={t('pro.privacy')}
        termsLabel={t('pro.terms')}
        notice={noticeText}
        busy={iap.busyId === PRODUCT_IDS.pro || iap.busyId === 'restore'}
        onBuy={buyPro}
        onRestore={iap.restore}
        onRetry={iap.reloadPrices}
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
    </div>
  );
}
