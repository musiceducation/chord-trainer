import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Sparkles, Lightbulb } from 'lucide-react';
import { AnswerSurface } from './AnswerSurface.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import {
  chordTypeI18nKey,
  formatChord,
  formatSlashChord,
  generateInvertedQuestion,
  generateQuestion,
  isCorrectNote,
  questionFromSpec,
  romanPlayIsCorrect,
  targetPcsInChordOrder,
} from '../lib/chords.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { FULL_END, FULL_START } from '../lib/constants.js';
import { scheduleAllHint, scheduleSequentialHint } from '../lib/hintFlash.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function TestMode({
  difficulty,
  soundOn,
  pianoSound,
  stats: _stats,
  setStats,
  onScoreChange,
  hidden,
  tutorial = false,
  fixedQuestion = null,
  onQuestionComplete,
  hideSkip = false,
  forceSequentialHint = false,
  autoHint = false,
  onAutoHintUsed,
  questionEpoch = '',
  onRoundSettled,
  answerSurface = 'keyboard',
  inversions = false,
  onInversionsChange,
}) {
  const fixedKey = fixedQuestion ? `${fixedQuestion.root}:${fixedQuestion.type}` : null;
  const practiceInversions = Boolean(inversions) && !tutorial && !fixedQuestion;
  const [question, setQuestion] = useState(() => (
    fixedQuestion
      ? questionFromSpec(fixedQuestion.root, fixedQuestion.type)
      : practiceInversions
        ? generateInvertedQuestion(difficulty, null)
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
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const autoHintUsedRef = useRef(false);
  const advanceRoundRef = useRef(() => {});
  const settledWhileHidden = useRef(false);
  const lockedRef = useRef(lockedCorrect);
  const pressedRef = useRef(pressed);
  lockedRef.current = lockedCorrect;
  pressedRef.current = pressed;
  const { playNote, playChord } = usePiano(soundOn && !hidden, pianoSound);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  useEffect(() => {
    clearAll();
    setQuestion(fixedKey
      ? questionFromSpec(...fixedKey.split(':'))
      : practiceInversions
        ? generateInvertedQuestion(difficulty, null)
        : generateQuestion(difficulty, null));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setStreak(0);
    setHintNotes(null);
    setHasFailed(false);
    setScore({ correct: 0, total: 0 });
    setLiveMessage('');
    if (practiceInversions) setKeyboardStart(48);
  }, [difficulty, fixedKey, questionEpoch, practiceInversions, clearAll]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  useEffect(() => {
    if (hidden || feedback) return;
    if (forceSequentialHint) {
      scheduleSequentialHint(targetPcsInChordOrder(question.root, question.type), setHintNotes, schedule);
      return;
    }
    if (autoHint && !autoHintUsedRef.current) {
      autoHintUsedRef.current = true;
      scheduleAllHint([...question.pcs], setHintNotes, schedule);
      onAutoHintUsed?.();
    }
  }, [hidden, feedback, forceSequentialHint, autoHint, question, schedule, onAutoHintUsed]);

  useEffect(() => {
    if (feedback || hidden) return;
    if (lockedCorrect.size !== question.pcs.size || lockedCorrect.size === 0) return;

    const allMatch = [...question.pcs].every((pc) => lockedCorrect.has(pc));
    if (!allMatch) return;

    setFeedback('correct');
    setLiveMessage(tRef.current('live.correct'));
    playChord([...pressed]);

    const missed = hasFailedRef.current;
    const newStreak = computeStreakAfterSuccess(streakRef.current, missed);
    if (!tutorial) {
      setStats((prev) => recordCorrectAttempt(prev, {
        chordName: question.name,
        newStreak,
        isEarMode: false,
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
        mode: 'test',
      },
    };
    const advance = () => {
      if (!tutorial) onRoundSettled?.(payload);
      if (onQuestionComplete) {
        onQuestionComplete(payload);
        return;
      }
      setQuestion((q) => (practiceInversions
        ? generateInvertedQuestion(difficulty, q.id)
        : generateQuestion(difficulty, q.name)));
      setPressed(new Set());
      setLockedCorrect(new Set());
      setFeedback(null);
      setHintNotes(null);
      setHasFailed(false);
      setLiveMessage('');
    };
    advanceRoundRef.current = advance;
    schedule(advance, 1400);
  }, [practiceInversions, lockedCorrect, question, feedback, difficulty, pressed, playChord, setStats, schedule, hidden, tutorial, onQuestionComplete, onRoundSettled]);

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

  const handleKey = useCallback((midi) => {
    if (feedback === 'correct') return;
    playNote(midi);
    const pc = ((midi % 12) + 12) % 12;
    if (!isCorrectNote(midi, question.pcs)) {
      setWrongFlash(midi);
      setLiveMessage(t('live.tryAgain'));
      schedule(() => setWrongFlash((prev) => (prev === midi ? null : prev)), 350);
      if (!tutorial) {
        setStreak(computeStreakAfterWrong());
        setHasFailed(true);
        setStats((prev) => recordWrongAttempt(prev, question.name));
      }
      return;
    }

    if (!practiceInversions) {
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
      return;
    }

    const nextLocked = new Set(lockedRef.current);
    nextLocked.add(pc);
    const nextPressed = new Set([...pressedRef.current].filter((played) => ((played % 12) + 12) % 12 !== pc));
    nextPressed.add(midi);
    const complete = nextLocked.size === question.pcs.size
      && [...question.pcs].every((tone) => nextLocked.has(tone));
    if (complete && !romanPlayIsCorrect([...nextPressed], {
      pcs: question.pcs,
      bassPc: question.bassPc,
      requireBass: true,
    })) {
      lockedRef.current = new Set();
      pressedRef.current = new Set();
      setLiveMessage(t('abrsm.wrongBass'));
      setPressed(new Set());
      setLockedCorrect(new Set());
      if (!tutorial) {
        setStreak(computeStreakAfterWrong());
        setHasFailed(true);
        setStats((prev) => recordWrongAttempt(prev, question.name));
      }
      return;
    }

    lockedRef.current = nextLocked;
    pressedRef.current = nextPressed;
    setLockedCorrect(nextLocked);
    setPressed(nextPressed);
    setLiveMessage('');
  }, [feedback, playNote, practiceInversions, question, schedule, setStats, t, tutorial]);

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
        mode: 'test',
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
    setQuestion((q) => (practiceInversions
      ? generateInvertedQuestion(difficulty, q.id)
      : generateQuestion(difficulty, q.name)));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setHintNotes(null);
    setHasFailed(false);
    setLiveMessage(t('live.skipped'));
  };

  const showHint = () => {
    if (practiceInversions) {
      const rootPc = question.tonePcs?.[0];
      if (rootPc != null && !lockedCorrect.has(rootPc)) {
        setHintNotes(new Set([rootPc]));
        schedule(() => setHintNotes(null), 2000);
        return;
      }
    }
    const remaining = forceSequentialHint
      ? targetPcsInChordOrder(question.root, question.type).filter((pc) => !lockedCorrect.has(pc))
      : [...question.pcs].filter((pc) => !lockedCorrect.has(pc));
    if (remaining.length === 0) return;
    if (forceSequentialHint) {
      scheduleSequentialHint(remaining, setHintNotes, schedule);
      return;
    }
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

  const showInversionToggle = !tutorial && !fixedQuestion && typeof onInversionsChange === 'function';
  const prompt = practiceInversions ? formatSlashChord(question) : formatChord(question.name);
  const promptSize = prompt.length > 6
    ? 'clamp(36px, 10vw, 72px)'
    : 'clamp(64px, 18vw, 140px)';
  const errorCopy = liveMessage === t('abrsm.wrongBass') || liveMessage === t('live.tryAgain');

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden} inert={hidden ? true : undefined}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      {showInversionToggle && (
        <div className="flex justify-center mb-1">
          <button
            type="button"
            aria-pressed={inversions}
            onClick={() => onInversionsChange(!inversions)}
            className="px-3 py-1 rounded-full text-xs font-semibold touch-none active:scale-[0.98]"
            style={{
              background: inversions ? 'rgba(187,154,247,0.18)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${inversions ? 'rgba(187,154,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
              color: inversions ? '#E0D4FF' : '#565F89',
            }}
          >
            {t('identify.inversions')}
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-y-auto">
        <div key={question.id || question.name} className="chord-name text-center relative">
          <div className="text-[10px] tracking-[0.5em] text-slate-500 uppercase mb-3 font-medium">
            {t(chordTypeI18nKey(question.type))}
          </div>
          <div
            className={`display-font font-black leading-[0.85] tracking-tighter relative ${feedback === 'correct' ? 'chord-success' : 'chord-idle'}`}
            style={{ fontSize: promptSize, color: '#DCE7FF' }}
          >
            {prompt}
          </div>
          {feedback === 'correct' && (
            <>
              <div className="absolute -top-3 -right-1 sparkle-anim"><Sparkles size={22} className="text-emerald-200" /></div>
              <div className="absolute -bottom-1 -left-3 sparkle-anim sparkle-delay"><Sparkles size={16} className="text-purple-200" /></div>
            </>
          )}
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
                  background: filled
                    ? (feedback === 'correct'
                      ? 'linear-gradient(90deg, #7ADCC8, #4FB8A0)'
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
              <Check size={12} aria-hidden="true" />
              <span>{t('action.perfect')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="text-slate-600 uppercase">
                {t('common.notesCount', { n: lockedCorrect.size, total: question.pcs.size })}
              </div>
              {errorCopy && (
                <div className="text-rose-300 font-semibold normal-case tracking-normal">{liveMessage}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnswerSurface
        key={answerSurface}
        surface={answerSurface}
        pressed={pressed}
        lockedCorrect={lockedCorrect}
        wrongFlash={wrongFlash}
        hintNotes={hintNotes}
        keyboardStart={keyboardStart}
        onKey={handleKey}
        onShiftKeyboard={shiftKeyboard}
        disabled={feedback === 'correct'}
        wide={practiceInversions}
      />

      <div className="flex justify-center gap-2 pb-2 safe-bottom">
        <button
          type="button"
          onClick={showHint}
          disabled={feedback === 'correct' || lockedCorrect.size === question.pcs.size}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Lightbulb size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.hint')}</span>
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
