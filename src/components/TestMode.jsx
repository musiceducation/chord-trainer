import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Sparkles, Lightbulb } from 'lucide-react';
import { Keyboard } from './Keyboard.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import {
  formatChord,
  generateQuestion,
  getLabel,
  isCorrectNote,
} from '../lib/chords.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { FULL_END, FULL_START } from '../lib/constants.js';

export function TestMode({
  difficulty,
  soundOn,
  stats: _stats,
  setStats,
  onScoreChange,
  hidden,
}) {
  const [question, setQuestion] = useState(() => generateQuestion(difficulty, null));
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
  const { playNote, playChord } = usePiano(soundOn);
  const { schedule, clearAll } = useTimeoutCleanup();

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  useEffect(() => {
    clearAll();
    setQuestion(generateQuestion(difficulty, null));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setStreak(0);
    setHintNotes(null);
    setHasFailed(false);
    setScore({ correct: 0, total: 0 });
    setLiveMessage('');
  }, [difficulty, clearAll]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  useEffect(() => {
    if (feedback || hidden) return;
    if (lockedCorrect.size !== question.pcs.size || lockedCorrect.size === 0) return;

    const allMatch = [...question.pcs].every((pc) => lockedCorrect.has(pc));
    if (!allMatch) return;

    setFeedback('correct');
    setLiveMessage('答對了！');
    playChord([...pressed]);

    const newStreak = computeStreakAfterSuccess(streakRef.current, hasFailedRef.current);
    setStats((prev) => recordCorrectAttempt(prev, {
      chordName: question.name,
      newStreak,
      isEarMode: false,
    }));
    setStreak(newStreak);
    setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));

    schedule(() => {
      setQuestion((q) => generateQuestion(difficulty, q.name));
      setPressed(new Set());
      setLockedCorrect(new Set());
      setFeedback(null);
      setHintNotes(null);
      setHasFailed(false);
      setLiveMessage('');
    }, 1400);
  }, [lockedCorrect, question, feedback, difficulty, pressed, playChord, setStats, schedule, hidden]);

  const handleKey = useCallback(async (midi) => {
    if (feedback === 'correct') return;
    await playNote(midi);
    const pc = midi % 12;
    if (isCorrectNote(midi, question.pcs)) {
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
      setWrongFlash(midi);
      setLiveMessage('音符錯誤，再試一次');
      schedule(() => setWrongFlash((prev) => (prev === midi ? null : prev)), 350);
      setStreak(computeStreakAfterWrong());
      setHasFailed(true);
      setStats((prev) => recordWrongAttempt(prev, question.name));
    }
  }, [feedback, playNote, question, schedule, setStats]);

  const skip = () => {
    clearAll();
    setStreak(computeStreakAfterWrong());
    setScore((s) => ({ ...s, total: s.total + 1 }));
    setStats((prev) => recordSkip(prev));
    setQuestion((q) => generateQuestion(difficulty, q.name));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setHintNotes(null);
    setHasFailed(false);
    setLiveMessage('已跳過此題');
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
        <div key={question.name} className="chord-name text-center relative">
          <div className="text-[10px] tracking-[0.5em] text-slate-500 uppercase mb-3 font-medium">
            {getLabel(question.type)}
          </div>
          <div
            className={`display-font font-black leading-[0.85] tracking-tighter relative ${feedback === 'correct' ? 'chord-success' : 'chord-idle'}`}
            style={{ fontSize: 'clamp(64px, 18vw, 140px)', color: '#DCE7FF' }}
          >
            {formatChord(question.name)}
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

        <div className="mt-3 h-5 text-xs tracking-wider">
          {feedback === 'correct' ? (
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold uppercase">
              <Check size={12} aria-hidden="true" /><span>Perfect</span>
            </div>
          ) : (
            <div className="text-slate-600 uppercase">{lockedCorrect.size} / {question.pcs.size} notes</div>
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
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">Hint</span>
        </button>
        <button type="button" onClick={skip} className="btn-action btn-neutral touch-none">
          <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">Skip</span>
        </button>
      </div>
    </div>
  );
}
