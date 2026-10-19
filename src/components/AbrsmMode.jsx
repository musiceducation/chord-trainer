import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Sparkles, Lightbulb } from 'lucide-react';
import { Keyboard } from './Keyboard.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import { ABRSM5_MODE_FILTERS, generateAbrsmQuestion } from '../lib/abrsm.js';
import { formatChord, formatPitchText } from '../lib/chords.js';
import { FULL_END, FULL_START } from '../lib/constants.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

function statsKey(q) {
  return `${q.tonic} ${q.mode}: ${q.symbol}`;
}

function filterButtonStyle(active) {
  return {
    background: active ? 'rgba(187,154,247,0.18)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(187,154,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#E0D4FF' : '#565F89',
  };
}

export function AbrsmMode({
  soundOn,
  pianoSound,
  setStats,
  onScoreChange,
  hidden,
}) {
  const [modeFilter, setModeFilter] = useState('both');
  const [question, setQuestion] = useState(() => generateAbrsmQuestion({ modeFilter: 'both' }));
  const [pressed, setPressed] = useState(new Set());
  const [lockedCorrect, setLockedCorrect] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [message, setMessage] = useState('');
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasFailed, setHasFailed] = useState(false);
  const [keyboardStart, setKeyboardStart] = useState(48);
  const [hintNotes, setHintNotes] = useState(null);
  const streakRef = useRef(0);
  const hasFailedRef = useRef(false);
  const { playNote, playChord } = usePiano(soundOn, pianoSound);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { hasFailedRef.current = hasFailed; }, [hasFailed]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  const resetRound = useCallback(() => {
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setHintNotes(null);
    setHasFailed(false);
    setMessage('');
  }, []);

  const nextQuestion = useCallback((filter) => {
    setQuestion((q) => generateAbrsmQuestion({ modeFilter: filter, lastId: q.id }));
    resetRound();
  }, [resetRound]);

  const changeFilter = (filter) => {
    clearAll();
    setModeFilter(filter);
    nextQuestion(filter);
  };

  useEffect(() => {
    if (feedback || hidden) return;
    if (lockedCorrect.size !== question.pcs.size) return;
    if (![...question.pcs].every((pc) => lockedCorrect.has(pc))) return;

    setFeedback('correct');
    setMessage('');
    playChord([...pressed]);
    const newStreak = computeStreakAfterSuccess(streakRef.current, hasFailedRef.current);
    setStats((prev) => recordCorrectAttempt(prev, { chordName: statsKey(question), newStreak }));
    setStreak(newStreak);
    setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
    schedule(() => nextQuestion(modeFilter), 1800);
  }, [lockedCorrect, pressed, question, feedback, hidden, playChord, setStats, schedule, nextQuestion, modeFilter]);

  const handleKey = useCallback((midi) => {
    if (feedback === 'correct') return;
    playNote(midi);
    const pc = midi % 12;
    if (question.pcs.has(pc)) {
      setLockedCorrect((prev) => (prev.has(pc) ? prev : new Set(prev).add(pc)));
      setPressed((prev) => new Set(prev).add(midi));
      return;
    }
    setWrongFlash(midi);
    setMessage(t('live.tryAgain'));
    schedule(() => setWrongFlash((prev) => (prev === midi ? null : prev)), 350);
    setStreak(computeStreakAfterWrong());
    setHasFailed(true);
    setStats((prev) => recordWrongAttempt(prev, statsKey(question)));
  }, [feedback, playNote, question, schedule, setStats, t]);

  const skip = () => {
    clearAll();
    setStreak(computeStreakAfterWrong());
    setScore((s) => ({ ...s, total: s.total + 1 }));
    setStats((prev) => recordSkip(prev));
    nextQuestion(modeFilter);
  };

  const showHint = () => {
    const remaining = [...question.pcs].filter((pc) => !lockedCorrect.has(pc));
    if (!remaining.length) return;
    setHintNotes(new Set([remaining[Math.floor(Math.random() * remaining.length)]]));
    schedule(() => setHintNotes(null), 2000);
  };

  const shiftKeyboard = (dir) => {
    const next = keyboardStart + dir * 12;
    if (next >= FULL_START && next + 12 <= FULL_END) setKeyboardStart(next);
  };

  const keyName = formatPitchText(question.tonic);
  const modeWord = t(question.mode === 'minor' ? 'abrsm.filter.minor' : 'abrsm.filter.major');

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden}>
      <div aria-live="polite" className="sr-only">{feedback === 'correct' ? t('live.correct') : message}</div>
      <div className="flex justify-center gap-1.5 mb-1">
        {ABRSM5_MODE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={modeFilter === filter}
            onClick={() => changeFilter(filter)}
            className="px-3 py-1 rounded-full text-xs font-semibold touch-none active:scale-[0.98]"
            style={filterButtonStyle(modeFilter === filter)}
          >
            {t(`abrsm.filter.${filter}`)}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-y-auto">
        <div key={question.id} className="chord-name text-center relative">
          <div className="text-xs tracking-[0.3em] text-slate-400 mb-3 font-semibold">
            <span className="normal-case">{keyName}</span>
            {' '}
            <span className="uppercase">{modeWord}</span>
          </div>
          <div
            className={`display-font font-black leading-[0.85] tracking-tighter ${feedback === 'correct' ? 'chord-success' : 'chord-idle'}`}
            style={{ fontSize: 'clamp(64px, 18vw, 140px)', color: '#E8DCFF' }}
          >
            {question.symbol}
          </div>
          {feedback === 'correct' && (
            <div className="absolute -top-3 -right-1 sparkle-anim"><Sparkles size={22} className="text-emerald-200" /></div>
          )}
        </div>
        <div className="mt-3 min-h-10 text-xs tracking-wider text-center px-3">
          {feedback === 'correct' ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold uppercase">
                <Check size={12} aria-hidden="true" /><span>{t('action.perfect')}</span>
              </div>
              <div className="text-slate-100 font-semibold normal-case tracking-normal">
                {formatChord(question.chordName)} · {question.toneNames.map((name) => formatPitchText(name)).join(' ')}
              </div>
            </div>
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
          disabled={feedback === 'correct'}
          className="btn-action btn-hint disabled:opacity-30 touch-none"
        >
          <Lightbulb size={13} className="text-amber-300" aria-hidden="true" />
          <span className="text-xs text-amber-200 tracking-wider uppercase font-medium">{t('action.hint')}</span>
        </button>
        <button type="button" onClick={skip} className="btn-action btn-neutral touch-none">
          <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">{t('action.skip')}</span>
        </button>
      </div>
    </div>
  );
}
