import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, SkipForward, Headphones, Play, Lightbulb } from 'lucide-react';
import { ChoiceButtons } from './ChoiceButtons.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import {
  EAR_QUALITY_TYPES,
  earQualityDomId,
  earQualityLabelKey,
  earQualityPoolIsComplete,
  generateEarQualityQuestion,
  normalizeEarQualityPool,
  selectAllEarQualities,
  toggleEarQuality,
} from '../lib/earQuality.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

function poolChipStyle(active) {
  return {
    background: active ? 'rgba(122,220,200,0.16)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(122,220,200,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#D1FAF4' : '#565F89',
    fontWeight: active ? 700 : 500,
  };
}

export function EarQualityMode({
  pool,
  onPoolChange,
  soundOn,
  pianoSound,
  setStats,
  onScoreChange,
  hidden,
}) {
  const poolKey = normalizeEarQualityPool(pool).join('\u0001');
  const activePool = useMemo(() => poolKey.split('\u0001'), [poolKey]);
  const [question, setQuestion] = useState(() => generateEarQualityQuestion(poolKey.split('\u0001')));
  const [feedback, setFeedback] = useState(null);
  const [wrongType, setWrongType] = useState(null);
  const [hintType, setHintType] = useState(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasFailed, setHasFailed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const advanceRoundRef = useRef(() => {});
  const settledWhileHidden = useRef(false);
  const { playChord } = usePiano(soundOn && !hidden, pianoSound);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  const resetRound = useCallback(() => {
    setFeedback(null);
    setWrongType(null);
    setHintType(null);
    setHasFailed(false);
  }, []);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  useEffect(() => {
    if (activePool.includes(question.type)) return;
    clearAll();
    setQuestion(generateEarQualityQuestion(activePool));
    resetRound();
    setLiveMessage('');
  }, [activePool, question.type, clearAll, resetRound]);

  useEffect(() => {
    if (hidden || !soundOn || feedback) return undefined;
    const midis = question.voicing;
    const timer = window.setTimeout(() => { playChord(midis); }, 280);
    return () => window.clearTimeout(timer);
  }, [hidden, soundOn, feedback, question, playChord]);

  useEffect(() => {
    if (feedback !== 'correct') {
      settledWhileHidden.current = false;
      return;
    }
    if (!hidden || settledWhileHidden.current) return;
    settledWhileHidden.current = true;
    clearAll();
    advanceRoundRef.current();
  }, [hidden, feedback, clearAll]);

  const qualityName = useCallback((type) => tRef.current(earQualityLabelKey(type)), []);

  const choose = (type) => {
    if (feedback === 'correct') return;
    if (type === question.type) {
      setFeedback('correct');
      setWrongType(null);
      setHintType(null);
      const missed = hasFailedRef.current;
      const newStreak = computeStreakAfterSuccess(streakRef.current, missed);
      setStats((prev) => recordCorrectAttempt(prev, {
        chordName: question.name,
        newStreak,
        isEarMode: true,
      }));
      setStreak(newStreak);
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      setLiveMessage(t('live.correctNamed', { name: qualityName(type) }));
      if (soundOn) playChord(question.voicing);
      const nextPool = activePool;
      const advance = () => {
        setQuestion((q) => generateEarQualityQuestion(nextPool, q.name));
        resetRound();
        setLiveMessage('');
      };
      advanceRoundRef.current = advance;
      schedule(advance, 1400);
      return;
    }
    setWrongType(type);
    setLiveMessage(t('live.tryAgain'));
    if (!hasFailedRef.current) {
      setStats((prev) => recordWrongAttempt(prev, question.name));
    }
    setHasFailed(true);
    setStreak(computeStreakAfterWrong());
  };

  const skip = () => {
    clearAll();
    setStreak(computeStreakAfterWrong());
    setScore((s) => ({ ...s, total: s.total + 1 }));
    setStats((prev) => recordSkip(prev));
    setQuestion((q) => generateEarQualityQuestion(activePool, q.name));
    resetRound();
    setLiveMessage(t('live.skipped'));
  };

  const showHint = () => {
    if (feedback === 'correct') return;
    setHintType(question.type);
    schedule(() => setHintType(null), 2000);
  };

  const replay = () => {
    if (!soundOn) return;
    playChord(question.voicing);
  };

  const allSelected = earQualityPoolIsComplete(activePool);

  const togglePool = (type) => {
    if (feedback === 'correct') return;
    onPoolChange?.(toggleEarQuality(activePool, type));
  };

  const selectAll = () => {
    if (feedback === 'correct' || allSelected) return;
    onPoolChange?.(selectAllEarQualities());
  };

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden} inert={hidden ? true : undefined}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="text-[10px] tracking-[0.5em] text-sky-300/80 uppercase mb-2 font-medium text-center">
          {t('listen.title')}
        </div>
        <div className="flex items-center justify-center gap-3 mb-1.5 px-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-[0.25em] font-semibold">
            {t('listen.pool')}
          </div>
          <button
            type="button"
            data-testid="quality-pool-select-all"
            onClick={selectAll}
            disabled={allSelected}
            className="text-[10px] uppercase tracking-[0.16em] font-semibold text-sky-300 disabled:text-slate-600 touch-none active:opacity-70"
          >
            {t('listen.selectAll')}
          </button>
        </div>
        <div
          className="flex flex-wrap justify-center gap-1.5 mb-3 px-1"
          role="group"
          aria-label={t('listen.poolAria')}
          data-testid="ear-quality-pool"
        >
          {EAR_QUALITY_TYPES.map((type) => {
            const selected = activePool.includes(type);
            return (
              <button
                key={earQualityDomId(type)}
                type="button"
                aria-pressed={selected}
                data-testid={`quality-pool-${earQualityDomId(type)}`}
                onClick={() => togglePool(type)}
                className="px-2.5 py-1 rounded-full text-[11px] touch-none active:scale-[0.98]"
                style={poolChipStyle(selected)}
              >
                {t(earQualityLabelKey(type))}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center px-3 pb-3">
          <button
            type="button"
            aria-label={t('ear.playChord')}
            disabled={!soundOn}
            onClick={replay}
            className="relative transition-transform touch-none active:scale-95 disabled:opacity-40 ear-play-btn"
          >
            <div className="absolute inset-0 rounded-full pulse-ring-bg" />
            <Headphones size={48} className="mx-auto text-sky-200" aria-hidden="true" />
          </button>
          <div className="mt-3 text-center">
            <div className="text-sm text-slate-300 font-semibold tracking-wider mb-1">{t('listen.tapToHear')}</div>
            <div className="text-xs text-slate-500 tracking-wider">{t('listen.pickQuality')}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-[0.2em] mt-1">{t('listen.rootOnly')}</div>
            {!soundOn && <div className="text-xs text-amber-300/80 mt-2">{t('ear.soundOff')}</div>}
          </div>
          <div className="mt-3 min-h-8 text-xs tracking-wider text-center">
            {feedback === 'correct' ? (
              <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-semibold uppercase">
                <Check size={12} aria-hidden="true" />
                <span>{qualityName(question.type)}</span>
              </div>
            ) : (
              liveMessage && <div className="text-rose-300 font-semibold normal-case tracking-normal">{liveMessage}</div>
            )}
          </div>
        </div>

        <ChoiceButtons
          choices={activePool}
          disabled={feedback === 'correct'}
          wrongId={wrongType}
          hintId={hintType}
          correctId={feedback === 'correct' ? question.type : null}
          columns={activePool.length > 4 ? 3 : 2}
          onChoose={choose}
          getId={(type) => type}
          getKey={(type) => earQualityDomId(type)}
          getLabel={(type) => t(earQualityLabelKey(type))}
          ariaLabel={t('listen.answersAria')}
          testIdFor={(type) => `quality-answer-${earQualityDomId(type)}`}
        />
      </div>

      <div className="flex justify-center gap-2 pb-2 safe-bottom">
        <button
          type="button"
          onClick={showHint}
          disabled={feedback === 'correct'}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Lightbulb size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.hint')}</span>
        </button>
        <button
          type="button"
          onClick={replay}
          disabled={!soundOn}
          className="btn-action btn-ear disabled:opacity-40 touch-none"
        >
          <Play size={13} className="text-emerald-300" aria-hidden="true" />
          <span className="text-xs text-emerald-200 tracking-wider uppercase font-medium">{t('action.replay')}</span>
        </button>
        <button type="button" onClick={skip} className="btn-action btn-neutral touch-none">
          <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">{t('action.skip')}</span>
        </button>
      </div>
    </div>
  );
}
