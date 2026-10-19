import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, SkipForward, Sparkles, Play, Music2, Undo2, Lightbulb, Lock } from 'lucide-react';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import { voiceLeadProgression } from '../lib/chords.js';
import {
  PROGRESSION_CATALOG,
  degreeTable,
  formatProgressionAnswer,
  formatProgressionPattern,
  generateProgressionQuestion,
  getDegreeByNum,
  isProgressionAnswerCorrect,
  resolveDegreeChord,
} from '../lib/diatonic.js';
import { canAccessProgression } from '../lib/entitlement.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

/** Long enough to hear each change; the previous chord still rings into the next. */
const PROGRESSION_GAP_MS = 1500;
const PROGRESSION_SUSTAIN = 2.6;
const TONIC_SUSTAIN = 1.7;
const TONIC_GAP_MS = 700;

function emptyAnswer(length) {
  return Array.from({ length }, () => null);
}

function filledCount(answer) {
  return answer.filter((n) => n != null).length;
}

function bookQuestion(question) {
  return {
    kind: 'progression',
    mode: 'progression',
    progressionId: question.progressionId,
    quality: question.quality,
    keyRoot: question.keyRoot,
  };
}

function dealQuestion({ fixed, selectedId, allowedIds, tier, lastLabel }) {
  if (fixed?.progressionId) {
    return generateProgressionQuestion({
      progressionId: fixed.progressionId,
      quality: fixed.quality,
      keyRoot: fixed.keyRoot,
      tier,
      allowedIds: [fixed.progressionId],
      lastLabel,
      random: () => 0,
    });
  }
  return generateProgressionQuestion({
    progressionId: selectedId,
    tier,
    allowedIds,
    lastLabel,
  });
}

export function ProgressionEarMode({
  difficulty,
  soundOn,
  pianoSound,
  stats: _stats,
  setStats,
  onScoreChange,
  hidden,
  autoHint = false,
  onAutoHintUsed,
  onRoundSettled,
  onQuestionComplete,
  fixedQuestion = null,
  questionEpoch = '',
  isPro = false,
  onLockedProgression,
}) {
  const allowedIds = useMemo(
    () => PROGRESSION_CATALOG.filter((item) => canAccessProgression(isPro, item.id)).map((item) => item.id),
    [isPro],
  );
  const allowedKey = allowedIds.join('|');
  const fixedKey = fixedQuestion
    ? `${fixedQuestion.progressionId}:${fixedQuestion.quality}:${fixedQuestion.keyRoot}`
    : '';
  const [selectedId, setSelectedId] = useState('I-IV-V-I');
  const [deal, setDeal] = useState(0);
  const [question, setQuestion] = useState(() => (
    canAccessProgression(isPro, 'I-IV-V-I')
      ? dealQuestion({
        fixed: fixedQuestion,
        selectedId: 'I-IV-V-I',
        allowedIds: PROGRESSION_CATALOG.map((item) => item.id),
        tier: difficulty,
      })
      : null
  ));
  const [answer, setAnswer] = useState(() => emptyAnswer(question?.length || 4));
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasFailed, setHasFailed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasHeardProgression, setHasHeardProgression] = useState(false);
  const [hintDegrees, setHintDegrees] = useState(null);
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const abortRef = useRef(null);
  const autoHintUsedRef = useRef(false);
  const { playChord, playSequence } = usePiano(soundOn, pianoSound);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  const stopPlayback = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const applyQuestion = useCallback((next) => {
    setQuestion(next);
    setAnswer(emptyAnswer(next?.length || 4));
    setFeedback(null);
    setHasFailed(false);
    setHasHeardProgression(false);
    setHintDegrees(null);
    setLiveMessage('');
    return next;
  }, []);

  useEffect(() => {
    clearAll();
    stopPlayback();
    setStreak(0);
    setScore({ correct: 0, total: 0 });
    if (!allowedIds.length) {
      applyQuestion(null);
      return;
    }
    const safeSelected = allowedIds.includes(selectedId) ? selectedId : allowedIds[0];
    if (safeSelected && safeSelected !== selectedId) setSelectedId(safeSelected);
    applyQuestion(dealQuestion({
      fixed: fixedKey ? fixedQuestion : null,
      selectedId: safeSelected || selectedId,
      allowedIds,
      tier: difficulty,
    }));
    // allowedKey/fixedKey capture the values that should redeal; objects are stable for those keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, selectedId, deal, questionEpoch, allowedKey, fixedKey, clearAll, stopPlayback, applyQuestion]);

  const playTonic = useCallback(async () => {
    if (!soundOn || isPlaying || !question) return false;
    const midis = question.tonicVoicing || voiceLeadProgression([question.tonic])[0];
    return playChord(midis, { sustain: TONIC_SUSTAIN });
  }, [soundOn, isPlaying, question, playChord]);

  const playProgression = useCallback(async ({ withTonic = false } = {}) => {
    if (!soundOn || !question) return false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPlaying(true);
    setHasHeardProgression(true);
    const sequences = question.voicings?.length
      ? question.voicings
      : voiceLeadProgression(question.chords);
    try {
      if (withTonic) {
        const tonicMidis = question.tonicVoicing || voiceLeadProgression([question.tonic])[0];
        await playChord(tonicMidis, { sustain: TONIC_SUSTAIN });
        await wait(TONIC_GAP_MS, controller.signal);
      }
      await playSequence(sequences, PROGRESSION_GAP_MS, controller.signal, {
        sustain: PROGRESSION_SUSTAIN,
      });
    } catch (err) {
      if (!isAbortError(err)) return false;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsPlaying(false);
      }
    }
    return !controller.signal.aborted;
  }, [soundOn, question, playChord, playSequence]);

  const playbackRef = useRef(playProgression);
  useEffect(() => { playbackRef.current = playProgression; }, [playProgression]);

  useEffect(() => {
    if (hidden || !soundOn || !question?.label) {
      stopPlayback();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      playbackRef.current?.({ withTonic: true });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      stopPlayback();
    };
  }, [question?.label, hidden, soundOn, stopPlayback]);

  const resetQuestion = useCallback((lastLabel = null) => {
    stopPlayback();
    if (!allowedIds.length) return applyQuestion(null);
    const safeSelected = allowedIds.includes(selectedId) ? selectedId : allowedIds[0];
    return applyQuestion(dealQuestion({
      fixed: fixedKey ? fixedQuestion : null,
      selectedId: safeSelected || selectedId,
      allowedIds,
      tier: difficulty,
      lastLabel,
    }));
  }, [allowedIds, selectedId, fixedKey, fixedQuestion, difficulty, stopPlayback, applyQuestion]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  const flashHintDegrees = useCallback((nums) => {
    if (!nums.length) return;
    setHintDegrees(new Set(nums));
    schedule(() => setHintDegrees(null), 2000);
  }, [schedule]);

  useEffect(() => {
    if (hidden || !question || !autoHint || autoHintUsedRef.current) return;
    autoHintUsedRef.current = true;
    flashHintDegrees(question.degreeNums);
    onAutoHintUsed?.();
  }, [hidden, autoHint, question, flashHintDegrees, onAutoHintUsed]);

  const settleRound = useCallback((payload) => {
    onRoundSettled?.(payload);
    if (onQuestionComplete) {
      onQuestionComplete(payload);
      return;
    }
    resetQuestion(question?.label);
  }, [onRoundSettled, onQuestionComplete, resetQuestion, question?.label]);

  const handleWrongAnswer = useCallback(() => {
    setFeedback('wrong');
    setLiveMessage(t('live.tryAgain'));
    setStreak(computeStreakAfterWrong());
    setHasFailed(true);
    setStats((prev) => recordWrongAttempt(prev, question.label, { kind: 'progression' }));
    setScore((s) => ({ ...s, total: s.total + 1 }));

    schedule(() => {
      setAnswer(emptyAnswer(question.length));
      setFeedback(null);
      setLiveMessage('');
    }, 1800);
  }, [question, schedule, setStats, t]);

  const handleCorrectAnswer = useCallback(() => {
    setFeedback('correct');
    setLiveMessage(t('live.correctNamed', {
      name: formatProgressionAnswer(question.degreeNums, question.quality),
    }));
    playProgression({ withTonic: false });

    const missed = hasFailedRef.current;
    const newStreak = computeStreakAfterSuccess(streakRef.current, missed);
    setStats((prev) => recordCorrectAttempt(prev, {
      chordName: question.label,
      newStreak,
      isEarMode: true,
      kind: 'progression',
    }));
    setStreak(newStreak);
    setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));

    const payload = {
      missed,
      skipped: false,
      streak: missed ? 0 : newStreak,
      question: bookQuestion(question),
    };
    schedule(() => settleRound(payload), 1600);
  }, [question, playProgression, schedule, setStats, t, settleRound]);

  const playDegreeChord = useCallback((degreeNum) => {
    if (!soundOn) return;
    const chord = resolveDegreeChord(
      question.keyRoot,
      degreeNum,
      difficulty,
      question.chords,
      question.quality,
    );
    const voicing = voiceLeadProgression([chord])[0];
    playChord(voicing, { sustain: TONIC_SUSTAIN });
  }, [soundOn, difficulty, question, playChord]);

  const pickDegree = (num) => {
    if (feedback || isPlaying) return;
    const target = answer.findIndex((slot) => slot == null);
    if (target < 0) return;
    playDegreeChord(num);
    const next = [...answer];
    next[target] = num;
    setAnswer(next);
  };

  const undoLast = () => {
    if (feedback || isPlaying || filledCount(answer) === 0) return;
    const next = [...answer];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i] != null) {
        next[i] = null;
        break;
      }
    }
    setAnswer(next);
  };

  const confirmAnswer = () => {
    if (feedback || isPlaying || filledCount(answer) !== question.length) return;
    if (isProgressionAnswerCorrect(answer, question.degreeNums)) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  const showHint = () => {
    if (feedback) return;
    const emptyIdx = answer.findIndex((slot) => slot == null);
    if (emptyIdx < 0) {
      flashHintDegrees(question.degreeNums);
      return;
    }
    flashHintDegrees([question.degreeNums[emptyIdx]]);
  };

  const skip = () => {
    clearAll();
    stopPlayback();
    const payload = {
      missed: hasFailedRef.current,
      skipped: true,
      streak: 0,
      question: bookQuestion(question),
    };
    setStreak(computeStreakAfterWrong());
    setScore((s) => ({ ...s, total: s.total + 1 }));
    setStats((prev) => recordSkip(prev));
    setLiveMessage(t('live.skipped'));
    settleRound(payload);
  };

  const chooseProgression = (item) => {
    if (fixedKey) return;
    if (!canAccessProgression(isPro, item.id)) {
      onLockedProgression?.();
      return;
    }
    setSelectedId(item.id);
    setDeal((n) => n + 1);
  };

  const answered = filledCount(answer);
  const allFilled = question ? answered === question.length : false;
  const disabledInput = feedback !== null || isPlaying || !question;
  const degrees = degreeTable(question?.quality || 'major');
  const displayRomans = question
    ? Array.from({ length: question.length }, (_, i) => {
      const num = answer[i];
      return num ? getDegreeByNum(num, question.quality).roman : '·';
    })
    : [];
  const qualityLabel = question?.quality === 'minor'
    ? t('progression.minorSuffix')
    : t('progression.majorSuffix');

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-y-auto">
        <div className="prog-picker" role="listbox" aria-label={t('progression.choose')}>
          {PROGRESSION_CATALOG.map((item) => {
            const locked = !canAccessProgression(isPro, item.id);
            const label = formatProgressionPattern(item.id, 'major');
            const active = question?.progressionId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={locked ? `${label}, ${t('pro.lockLabel')}` : label}
                disabled={Boolean(fixedKey)}
                onClick={() => chooseProgression(item)}
                className={`prog-picker-btn touch-none ${active ? 'prog-picker-active' : ''} ${locked ? 'prog-picker-locked' : ''}`}
              >
                <span className="display-font font-bold">{label}</span>
                {locked && <Lock size={12} className="text-amber-300 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {!question && (
          <button
            type="button"
            onClick={() => onLockedProgression?.()}
            className="prog-picker-btn prog-picker-locked mt-2 px-4 touch-none"
          >
            <Lock size={14} className="text-amber-300" aria-hidden="true" />
            <span>{t('ramp.proNudge')}</span>
          </button>
        )}

        {question && (
        <>
        <div key={question.label} className="chord-name text-center relative">
          <div className="text-[10px] tracking-[0.5em] text-slate-500 mb-3 font-medium">
            <span className="normal-case">{question.keyRoot}</span>
            {' '}
            <span className="uppercase">{qualityLabel}</span>
          </div>
          <div
            className={`flex items-end justify-center gap-3 sm:gap-4 ${feedback === 'correct' ? 'chord-success' : ''} ${feedback === 'wrong' ? 'wrong-shake' : ''}`}
          >
            {displayRomans.map((roman, i) => {
              const filled = answer[i] != null;
              return (
                <div
                  key={`${question.label}-${i}`}
                  aria-label={filled
                    ? t('progression.chordNNamed', { n: i + 1, roman })
                    : t('progression.chordN', { n: i + 1 })}
                  className={`display-font font-black leading-[0.85] tracking-tighter ${filled || feedback ? '' : 'chord-idle'}`}
                  style={{
                    fontSize: 'clamp(40px, 11vw, 88px)',
                    color: feedback === 'wrong' && filled
                      ? '#F7768E'
                      : filled
                      ? '#DCE7FF'
                      : '#3B4261',
                  }}
                >
                  {roman}
                </div>
              );
            })}
          </div>
          {feedback === 'correct' && (
            <>
              <div className="absolute -top-3 -right-1 sparkle-anim"><Sparkles size={22} className="text-emerald-200" /></div>
              <div className="absolute -bottom-1 -left-3 sparkle-anim sparkle-delay"><Sparkles size={16} className="text-purple-200" /></div>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          {Array.from({ length: question.length }).map((_, i) => {
            const filled = answer[i] != null;
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-500 progress-dot"
                style={{
                  width: filled ? '28px' : '8px',
                  background: filled
                    ? (feedback === 'correct'
                      ? 'linear-gradient(90deg, #7ADCC8, #4FB8A0)'
                      : feedback === 'wrong'
                      ? 'linear-gradient(90deg, #F7768E, #BB9AF7)'
                      : 'linear-gradient(90deg, #7AA2F7, #BB9AF7)')
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: filled ? '0 0 12px rgba(122,162,247,0.5)' : 'none',
                }}
              />
            );
          })}
        </div>

        <div className="mt-3 min-h-10 text-xs tracking-wider text-center px-3">
          {feedback === 'correct' ? (
            <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-semibold uppercase">
              <Check size={12} aria-hidden="true" /><span>{t('action.perfect')}</span>
            </div>
          ) : allFilled && feedback !== 'wrong' ? (
            <div className="text-slate-400 uppercase">{t('progression.confirm')}</div>
          ) : (
            <div className="text-slate-600 uppercase">
              {t('progression.chordsCount', { n: answered, total: question.length })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {question && (
      <>
      <section aria-label={t('progression.degreePad')} className="keyboard-section">
        <div className="keyboard-octave-bar">
          <button
            type="button"
            onClick={undoLast}
            disabled={disabledInput || answered === 0}
            className="btn-octave disabled:opacity-30 touch-none"
          >
            <Undo2 size={12} className="text-slate-400" aria-hidden="true" />
            <span className="text-[10px] text-slate-500 tracking-wider uppercase">{t('action.undo')}</span>
          </button>
          <div className="keyboard-octave-label">{t('progression.degree')}</div>
          <div className="btn-octave opacity-0 pointer-events-none" aria-hidden="true">
            <span className="text-[10px] tracking-wider uppercase">{t('action.check')}</span>
          </div>
        </div>

        <div className="relative w-full prog-pad-shell">
          <div className="absolute inset-0 rounded-2xl p-1.5 sm:p-2 keyboard-frame">
            <div className="grid grid-cols-4 gap-1.5 h-full">
              {degrees.slice(0, 4).map((degree) => (
                <button
                  key={degree.num}
                  type="button"
                  aria-label={degree.roman}
                  disabled={disabledInput}
                  onClick={() => pickDegree(degree.num)}
                  className={`prog-degree-key touch-none active:scale-[0.98] disabled:opacity-40 ${hintDegrees?.has(degree.num) ? 'prog-degree-hint' : ''}`}
                >
                  <span className="display-font font-black">{degree.roman}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="relative w-full prog-pad-shell-sm mt-1.5">
          <div className="absolute inset-0 rounded-2xl p-1.5 sm:p-2 keyboard-frame">
            <div className="grid grid-cols-3 gap-1.5 h-full">
              {degrees.slice(4).map((degree) => (
                <button
                  key={degree.num}
                  type="button"
                  aria-label={degree.roman}
                  disabled={disabledInput}
                  onClick={() => pickDegree(degree.num)}
                  className={`prog-degree-key touch-none active:scale-[0.98] disabled:opacity-40 ${hintDegrees?.has(degree.num) ? 'prog-degree-hint' : ''}`}
                >
                  <span className="display-font font-black">{degree.roman}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center flex-wrap gap-2 pb-2 safe-bottom">
        <button
          type="button"
          onClick={showHint}
          disabled={feedback !== null}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Lightbulb size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.hint')}</span>
        </button>
        <button
          type="button"
          onClick={playTonic}
          disabled={!soundOn || isPlaying}
          className="btn-action btn-neutral disabled:opacity-30 touch-none"
        >
          <Music2 size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.tonic')}</span>
        </button>
        <button
          type="button"
          onClick={() => playProgression({ withTonic: false })}
          disabled={!soundOn || isPlaying}
          className="btn-action btn-neutral disabled:opacity-30 touch-none"
        >
          <Play size={13} className="text-slate-300" aria-hidden="true" />
          <span className="text-xs text-slate-300 tracking-wider uppercase font-medium">
            {hasHeardProgression ? t('action.replay') : t('action.play')}
          </span>
        </button>
        <button
          type="button"
          onClick={confirmAnswer}
          disabled={feedback !== null || !allFilled || isPlaying}
          className="btn-action btn-ear disabled:opacity-30 touch-none"
        >
          <Check size={13} className="text-emerald-300" aria-hidden="true" />
          <span className="text-xs text-emerald-200 tracking-wider uppercase font-medium">{t('action.check')}</span>
        </button>
        <button type="button" onClick={skip} className="btn-action btn-neutral touch-none">
          <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">{t('action.skip')}</span>
        </button>
      </div>
      </>
      )}
    </div>
  );
}

function isAbortError(err) {
  return err?.name === 'AbortError';
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
