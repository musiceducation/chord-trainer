import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Headphones, Play, Lightbulb } from 'lucide-react';
import { Keyboard } from './Keyboard.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import {
  buildChordVoicing,
  chordTypeI18nKey,
  formatChord,
  formatChordAnswer,
  generateQuestion,
  isCorrectNote,
  questionFromSpec,
  targetPcsInChordOrder,
} from '../lib/chords.js';
import { PC_TO_NOTE } from '../lib/constants.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { FULL_END, FULL_START } from '../lib/constants.js';
import { describeWrongNote } from '../lib/noteDiff.js';
import { scheduleAllHint } from '../lib/hintFlash.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function EarMode({
  difficulty,
  soundOn,
  stats: _stats,
  setStats,
  onScoreChange,
  hidden,
  tutorial = false,
  fixedQuestion = null,
  onQuestionComplete,
  hideSkip = false,
  autoPlayOnce = false,
  hintAfterListen = false,
  autoHint = false,
  onAutoHintUsed,
  questionEpoch = '',
  onRoundSettled,
}) {
  const fixedKey = fixedQuestion ? `${fixedQuestion.root}:${fixedQuestion.type}` : null;
  const [question, setQuestion] = useState(() => (
    fixedQuestion
      ? questionFromSpec(fixedQuestion.root, fixedQuestion.type)
      : generateQuestion(difficulty, null)
  ));
  const [pressed, setPressed] = useState(new Set());
  const [lockedCorrect, setLockedCorrect] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [keyboardStart, setKeyboardStart] = useState(48);
  const [hintNotes, setHintNotes] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasFailed, setHasFailed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [wrongDetail, setWrongDetail] = useState('');
  const [answerReveal, setAnswerReveal] = useState(null);
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const autoHintUsedRef = useRef(false);
  const autoPlayedRef = useRef(false);
  const { playNote, playChord } = usePiano(soundOn);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  const replayChord = useCallback(async ({ withHint = true } = {}) => {
    if (!soundOn) return false;
    const midis = buildChordVoicing(question.root, question.type);
    const played = await playChord(midis);
    if (hintAfterListen && withHint) {
      scheduleAllHint(targetPcsInChordOrder(question.root, question.type), setHintNotes, schedule, 1600);
    }
    return played;
  }, [soundOn, question.root, question.type, playChord, hintAfterListen, schedule]);

  useEffect(() => {
    clearAll();
    setQuestion(fixedKey
      ? questionFromSpec(...fixedKey.split(':'))
      : generateQuestion(difficulty, null));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setStreak(0);
    setHintNotes(null);
    setHasFailed(false);
    setScore({ correct: 0, total: 0 });
    setLiveMessage('');
    setWrongDetail('');
    setAnswerReveal(null);
    autoPlayedRef.current = false;
  }, [difficulty, fixedKey, questionEpoch, clearAll]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  useEffect(() => {
    if (hidden || feedback) return;
    if (autoPlayOnce && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      const timer = window.setTimeout(() => { replayChord(); }, 400);
      return () => window.clearTimeout(timer);
    }
    if (autoHint && !autoHintUsedRef.current) {
      autoHintUsedRef.current = true;
      scheduleAllHint([...question.pcs], setHintNotes, schedule);
      onAutoHintUsed?.();
    }
    return undefined;
  }, [hidden, feedback, autoPlayOnce, autoHint, question, replayChord, schedule, onAutoHintUsed]);

  useEffect(() => {
    if (feedback || hidden) return;
    if (lockedCorrect.size !== question.pcs.size || lockedCorrect.size === 0) return;

    const allMatch = [...question.pcs].every((pc) => lockedCorrect.has(pc));
    if (!allMatch) return;

    setFeedback('correct');
    setWrongDetail('');
    setLiveMessage(tRef.current('live.correctNamed', { name: formatChord(question.name) }));
    replayChord({ withHint: false });

    const missed = hasFailedRef.current;
    const newStreak = computeStreakAfterSuccess(streakRef.current, missed);
    if (!tutorial) {
      setStats((prev) => recordCorrectAttempt(prev, {
        chordName: question.name,
        newStreak,
        isEarMode: true,
      }));
      setStreak(newStreak);
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
    }

    const payload = {
      missed,
      skipped: false,
      streak: missed ? 0 : newStreak,
      question: {
        root: question.root,
        type: question.type,
        name: question.name,
        mode: 'ear',
      },
    };
    schedule(() => {
      if (!tutorial) onRoundSettled?.(payload);
      if (onQuestionComplete) {
        onQuestionComplete(payload);
        return;
      }
      setQuestion((q) => generateQuestion(difficulty, q.name));
      setPressed(new Set());
      setLockedCorrect(new Set());
      setFeedback(null);
      setHintNotes(null);
      setHasFailed(false);
      setLiveMessage('');
      setWrongDetail('');
      setAnswerReveal(null);
    }, 1400);
  }, [lockedCorrect, question, feedback, difficulty, replayChord, setStats, schedule, hidden, tutorial, onQuestionComplete, onRoundSettled]);

  const handleKey = useCallback(async (midi) => {
    if (feedback === 'correct') return;
    await playNote(midi);
    const pc = midi % 12;
    if (isCorrectNote(midi, question.pcs)) {
      setWrongDetail('');
      setLockedCorrect((prev) => {
        if (prev.has(pc)) return prev;
        const next = new Set(prev);
        next.add(pc);
        return next;
      });
      setPressed((prev) => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });
    } else {
      const detail = describeWrongNote(midi, lockedCorrect, question.pcs, t);
      const picked = PC_TO_NOTE[midi % 12];
      const answerLabel = formatChordAnswer(question.name, t(chordTypeI18nKey(question.type)));
      setWrongFlash(midi);
      setWrongDetail(detail);
      setAnswerReveal({ picked, answer: answerLabel });
      setLiveMessage(`${detail}. ${t('feedback.youPlayed', { note: picked })}. ${t('feedback.answer', { name: answerLabel })}`);
      schedule(() => setWrongFlash((prev) => (prev === midi ? null : prev)), 350);
      if (!tutorial) {
        setStreak(computeStreakAfterWrong());
        setHasFailed(true);
        setStats((prev) => recordWrongAttempt(prev, question.name));
      }
    }
  }, [feedback, playNote, question, schedule, setStats, t, lockedCorrect, tutorial]);

  const skip = () => {
    if (hideSkip) return;
    clearAll();
    const payload = {
      missed: hasFailedRef.current,
      skipped: true,
      streak: 0,
      question: {
        root: question.root,
        type: question.type,
        name: question.name,
        mode: 'ear',
      },
    };
    if (!tutorial) {
      setStreak(computeStreakAfterWrong());
      setScore((s) => ({ ...s, total: s.total + 1 }));
      setStats((prev) => recordSkip(prev));
      onRoundSettled?.(payload);
    }
    if (onQuestionComplete) {
      onQuestionComplete(payload);
      return;
    }
    setQuestion((q) => generateQuestion(difficulty, q.name));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setHintNotes(null);
    setHasFailed(false);
    setWrongDetail('');
    setAnswerReveal(null);
    setLiveMessage(t('live.skipped'));
  };

  const showHint = () => {
    const remaining = [...question.pcs].filter((pc) => !lockedCorrect.has(pc));
    if (remaining.length === 0) return;
    const hintPc = remaining[Math.floor(Math.random() * remaining.length)];
    setHintNotes(new Set([hintPc]));
    schedule(() => setHintNotes(null), 2000);
  };

  const shiftKeyboard = (dir) => {
    const newStart = keyboardStart + dir * 12;
    if (newStart >= FULL_START && newStart + 12 <= FULL_END) {
      setKeyboardStart(newStart);
    }
  };

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-y-auto">
        <div className="text-[10px] tracking-[0.5em] text-emerald-400/70 uppercase mb-3 font-medium">
          {t('ear.listenPlay')}
        </div>

        <button
          type="button"
          aria-label={t('ear.playChord')}
          disabled={!soundOn}
          onClick={() => replayChord()}
          className="relative transition-transform touch-none active:scale-95 disabled:opacity-40 ear-play-btn"
        >
          <div className="absolute inset-0 rounded-full pulse-ring-bg" />
          <Headphones size={48} className="mx-auto text-emerald-200" aria-hidden="true" />
        </button>

        <div className="mt-4 text-center px-4">
          <div className="text-sm text-slate-300 font-semibold tracking-wider mb-1">{t('ear.tapToHear')}</div>
          <div className="text-xs text-slate-500 tracking-wider">{t('ear.playOnKeyboard')}</div>
          {!soundOn && <div className="text-xs text-amber-300/80 mt-2">{t('ear.soundOff')}</div>}
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          {[...Array(question.pcs.size)].map((_, i) => {
            const filled = i < lockedCorrect.size;
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-500 progress-dot"
                style={{
                  width: filled ? '28px' : '8px',
                  background: filled ? 'linear-gradient(90deg, #7ADCC8, #4FB8A0)' : 'rgba(255,255,255,0.08)',
                  boxShadow: filled ? '0 0 12px rgba(122,220,200,0.5)' : 'none',
                }}
              />
            );
          })}
        </div>

        <div className="mt-3 min-h-10 text-xs tracking-wider text-center px-3">
          {feedback === 'correct' ? (
            <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-semibold uppercase">
              <Check size={12} aria-hidden="true" /><span>{formatChord(question.name)} ✓</span>
            </div>
          ) : answerReveal ? (
            <div className="answer-reveal">
              <div className="text-rose-300 font-medium normal-case tracking-normal">
                {t('feedback.youPlayed', { note: answerReveal.picked })}
              </div>
              <div className="text-slate-100 font-semibold normal-case tracking-normal">
                {t('feedback.answer', { name: answerReveal.answer })}
              </div>
            </div>
          ) : wrongDetail ? (
            <div className="text-rose-300 font-medium normal-case tracking-normal">{wrongDetail}</div>
          ) : (
            <div className="text-slate-600 uppercase">
              {t('common.notesCount', { n: lockedCorrect.size, total: question.pcs.size })}
            </div>
          )}
        </div>
      </div>

      <Keyboard
        pressed={pressed}
        lockedCorrect={lockedCorrect}
        wrongFlash={wrongFlash}
        hintNotes={hintNotes}
        keyboardStart={keyboardStart}
        onKey={handleKey}
        onShiftKeyboard={shiftKeyboard}
        disabled={feedback === 'correct'}
      />

      <div className="flex justify-center gap-2 pb-2 safe-bottom">
        <button
          type="button"
          onClick={showHint}
          disabled={lockedCorrect.size === question.pcs.size}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Lightbulb size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.hint')}</span>
        </button>
        <button
          type="button"
          onClick={() => replayChord()}
          disabled={!soundOn}
          className="btn-action btn-ear disabled:opacity-40 touch-none"
        >
          <Play size={13} className="text-emerald-300" aria-hidden="true" />
          <span className="text-xs text-emerald-200 tracking-wider uppercase font-medium">{t('action.replay')}</span>
        </button>
        {!hideSkip && (
          <button type="button" onClick={skip} className="btn-action btn-neutral touch-none">
            <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
            <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">{t('action.skip')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
