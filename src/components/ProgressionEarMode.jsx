import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Sparkles, Play, Music2, Undo2 } from 'lucide-react';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import { buildChordVoicing } from '../lib/chords.js';
import {
  MAJOR_DEGREES,
  formatProgressionAnswer,
  generateProgressionQuestion,
  isProgressionAnswerCorrect,
  resolveDegreeChord,
} from '../lib/diatonic.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

const CHORD_GAP_MS = 1100;

function emptyAnswer(length) {
  return Array.from({ length }, () => null);
}

function filledCount(answer) {
  return answer.filter((n) => n != null).length;
}

function firstEmptyIndex(answer) {
  return answer.findIndex((n) => n == null);
}

function nextEmptyIndex(answer, fromIndex) {
  const len = answer.length;
  for (let i = 1; i <= len; i += 1) {
    const idx = (fromIndex + i) % len;
    if (answer[idx] == null) return idx;
  }
  return null;
}

export function ProgressionEarMode({
  difficulty,
  keyRoot,
  soundOn,
  stats: _stats,
  setStats,
  onScoreChange,
  hidden,
}) {
  const [question, setQuestion] = useState(() => generateProgressionQuestion({
    keyRoot,
    tier: difficulty,
  }));
  const [answer, setAnswer] = useState(() => emptyAnswer(4));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasFailed, setHasFailed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasHeardProgression, setHasHeardProgression] = useState(false);
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const abortRef = useRef(null);
  const { playChord, playSequence } = usePiano(soundOn);
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

  const playTonic = useCallback(async () => {
    if (!soundOn || isPlaying) return false;
    const midis = buildChordVoicing(question.tonic.root, question.tonic.type);
    return playChord(midis);
  }, [soundOn, isPlaying, question.tonic, playChord]);

  const playProgression = useCallback(async () => {
    if (!soundOn || isPlaying) return false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPlaying(true);
    setHasHeardProgression(true);
    const sequences = question.chords.map((chord) => buildChordVoicing(chord.root, chord.type));
    try {
      await playSequence(sequences, CHORD_GAP_MS, controller.signal);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsPlaying(false);
      }
    }
    return !controller.signal.aborted;
  }, [soundOn, isPlaying, question.chords, playSequence]);

  const resetQuestion = useCallback((lastLabel = null) => {
    stopPlayback();
    const next = generateProgressionQuestion({ keyRoot, tier: difficulty, lastLabel });
    setQuestion(next);
    setAnswer(emptyAnswer(next.length));
    setSelectedSlot(null);
    setFeedback(null);
    setHasFailed(false);
    setHasHeardProgression(false);
    setLiveMessage('');
    return next;
  }, [keyRoot, difficulty, stopPlayback]);

  useEffect(() => {
    clearAll();
    stopPlayback();
    setStreak(0);
    setScore({ correct: 0, total: 0 });
    setQuestion(generateProgressionQuestion({ keyRoot, tier: difficulty }));
    setAnswer(emptyAnswer(4));
    setSelectedSlot(null);
    setFeedback(null);
    setHasFailed(false);
    setHasHeardProgression(false);
    setLiveMessage('');
  }, [difficulty, keyRoot, clearAll, stopPlayback]);

  useEffect(() => {
    if (hidden) stopPlayback();
  }, [hidden, stopPlayback]);

  const playTonicRef = useRef(playTonic);
  useEffect(() => { playTonicRef.current = playTonic; }, [playTonic]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  useEffect(() => {
    if (hidden || !soundOn) return;
    const timer = window.setTimeout(() => {
      playTonicRef.current();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [question.label, hidden, soundOn]);

  const handleWrongAnswer = useCallback(() => {
    setFeedback('wrong');
    setLiveMessage(t('live.wrongAnswer', { answer: formatProgressionAnswer(question.degreeNums) }));
    setStreak(computeStreakAfterWrong());
    setHasFailed(true);
    setStats((prev) => recordWrongAttempt(prev, question.label, { kind: 'progression' }));
    setScore((s) => ({ ...s, total: s.total + 1 }));

    schedule(() => {
      setAnswer(emptyAnswer(question.length));
      setSelectedSlot(null);
      setFeedback(null);
      setLiveMessage('');
    }, 1800);
  }, [question, schedule, setStats, t]);

  const handleCorrectAnswer = useCallback(() => {
    setFeedback('correct');
    setLiveMessage(t('live.correctNamed', { name: formatProgressionAnswer(question.degreeNums) }));
    playProgression();

    const newStreak = computeStreakAfterSuccess(streakRef.current, hasFailedRef.current);
    setStats((prev) => recordCorrectAttempt(prev, {
      chordName: question.label,
      newStreak,
      isEarMode: true,
      kind: 'progression',
    }));
    setStreak(newStreak);
    setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));

    schedule(() => {
      resetQuestion(question.label);
    }, 1600);
  }, [question, playProgression, resetQuestion, schedule, setStats, t]);

  const playDegreeChord = useCallback((degreeNum) => {
    if (!soundOn) return;
    const chord = resolveDegreeChord(keyRoot, degreeNum, difficulty, question.chords);
    playChord(buildChordVoicing(chord.root, chord.type));
  }, [soundOn, keyRoot, difficulty, question.chords, playChord]);

  const pickDegree = (num) => {
    if (feedback) return;
    const target = selectedSlot != null ? selectedSlot : firstEmptyIndex(answer);
    if (target == null || target < 0) return;

    playDegreeChord(num);

    const next = [...answer];
    next[target] = num;
    setAnswer(next);
    setSelectedSlot(nextEmptyIndex(next, target));
  };

  const selectSlot = (index) => {
    if (feedback) return;
    setSelectedSlot(index);
  };

  const undoLast = () => {
    if (feedback || filledCount(answer) === 0) return;
    const filledIndexes = answer.map((n, i) => (n != null ? i : -1)).filter((i) => i >= 0);
    const target = selectedSlot != null && answer[selectedSlot] != null
      ? selectedSlot
      : filledIndexes[filledIndexes.length - 1];
    if (target == null || target < 0) return;
    const next = [...answer];
    next[target] = null;
    setAnswer(next);
    setSelectedSlot(target);
  };

  const confirmAnswer = () => {
    if (feedback || filledCount(answer) !== question.length) return;
    if (answer.some((n) => n == null)) return;
    if (isProgressionAnswerCorrect(answer, question.degreeNums)) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  const skip = () => {
    clearAll();
    stopPlayback();
    setStreak(computeStreakAfterWrong());
    setScore((s) => ({ ...s, total: s.total + 1 }));
    setStats((prev) => recordSkip(prev));
    resetQuestion(question.label);
    setLiveMessage(t('live.skipped'));
  };

  const answered = filledCount(answer);
  const allFilled = answered === question.length;
  const disabledInput = feedback !== null || isPlaying;
  const displayRomans = Array.from({ length: question.length }, (_, i) => {
    const num = answer[i];
    return num ? MAJOR_DEGREES.find((d) => d.num === num)?.roman : '·';
  });

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-y-auto">
        <div key={question.label} className="chord-name text-center relative">
          <div className="text-[10px] tracking-[0.5em] text-slate-500 mb-3 font-medium">
            <span className="normal-case">{keyRoot}</span>
            {' '}
            <span className="uppercase">{t('progression.majorSuffix')}</span>
          </div>
          <div
            className={`flex items-end justify-center gap-3 sm:gap-4 ${feedback === 'correct' ? 'chord-success' : ''} ${feedback === 'wrong' ? 'wrong-shake' : ''}`}
          >
            {displayRomans.map((roman, i) => {
              const filled = answer[i] != null;
              const selected = selectedSlot === i && !feedback;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={filled
                    ? t('progression.chordNNamed', { n: i + 1, roman })
                    : t('progression.chordN', { n: i + 1 })}
                  aria-pressed={selected}
                  disabled={feedback !== null}
                  onClick={() => selectSlot(i)}
                  className={`display-font font-black leading-[0.85] tracking-tighter bg-transparent p-0 touch-none ${filled || feedback || selected ? '' : 'chord-idle'} ${selected ? 'prog-slot-selected' : ''}`}
                  style={{
                    fontSize: 'clamp(40px, 11vw, 88px)',
                    color: feedback === 'wrong' && filled
                      ? '#F7768E'
                      : filled
                      ? '#DCE7FF'
                      : selected
                      ? '#C0CAF5'
                      : '#3B4261',
                  }}
                >
                  {roman}
                </button>
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

        <div className="mt-3 h-5 text-xs tracking-wider">
          {feedback === 'correct' ? (
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold uppercase">
              <Check size={12} aria-hidden="true" /><span>{t('action.perfect')}</span>
            </div>
          ) : feedback === 'wrong' ? (
            <div className="text-rose-300 font-medium uppercase">
              {formatProgressionAnswer(question.degreeNums)}
            </div>
          ) : allFilled ? (
            <div className="text-slate-400 uppercase">{t('progression.confirm')}</div>
          ) : (
            <div className="text-slate-600 uppercase">
              {t('progression.chordsCount', { n: answered, total: question.length })}
            </div>
          )}
        </div>
      </div>

      <section aria-label={t('progression.degreePad')} className="keyboard-section">
        <div className="keyboard-octave-bar">
          <button
            type="button"
            onClick={undoLast}
            disabled={feedback !== null || answered === 0}
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
              {MAJOR_DEGREES.slice(0, 4).map((degree) => (
                <button
                  key={degree.num}
                  type="button"
                  aria-label={degree.roman}
                  disabled={disabledInput}
                  onClick={() => pickDegree(degree.num)}
                  className="prog-degree-key touch-none active:scale-[0.98] disabled:opacity-40"
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
              {MAJOR_DEGREES.slice(4).map((degree) => (
                <button
                  key={degree.num}
                  type="button"
                  aria-label={degree.roman}
                  disabled={disabledInput}
                  onClick={() => pickDegree(degree.num)}
                  className="prog-degree-key touch-none active:scale-[0.98] disabled:opacity-40"
                >
                  <span className="display-font font-black">{degree.roman}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-2 pb-2 safe-bottom">
        <button
          type="button"
          onClick={playTonic}
          disabled={!soundOn || isPlaying}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Music2 size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.tonic')}</span>
        </button>
        <button
          type="button"
          onClick={playProgression}
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
          disabled={feedback !== null || !allFilled}
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
    </div>
  );
}
