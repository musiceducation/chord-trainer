import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, SkipForward, Sparkles } from 'lucide-react';
import { StaffChord } from './StaffChord.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { useTimeoutCleanup } from '../hooks/useTimeoutCleanup.js';
import {
  READ_TIERS,
  formatNoteName,
  generateReadQuestion,
  isReadAnswerCorrect,
  qualitiesForTier,
  questionFromReadSpec,
} from '../lib/readIdentify.js';
import {
  computeStreakAfterSuccess,
  computeStreakAfterWrong,
  recordCorrectAttempt,
  recordSkip,
  recordWrongAttempt,
} from '../lib/stats.js';
import { useI18n } from '../hooks/useI18n.jsx';

function tierButtonStyle(active) {
  return {
    background: active ? 'rgba(147,197,253,0.18)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(147,197,253,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#E0F2FE' : '#565F89',
  };
}

function choiceStyle({ correct, wrong }) {
  if (correct) {
    return {
      background: 'rgba(122,220,200,0.2)',
      border: '1px solid rgba(122,220,200,0.65)',
      color: '#D1FAE5',
    };
  }
  if (wrong) {
    return {
      background: 'rgba(247,118,142,0.18)',
      border: '1px solid rgba(247,118,142,0.55)',
      color: '#FECACA',
    };
  }
  return {
    background: 'rgba(147,197,253,0.1)',
    border: '1px solid rgba(147,197,253,0.35)',
    color: '#F0F4FF',
  };
}

function specKey(spec) {
  if (!spec?.root) return '';
  return `${spec.root}:${spec.type || ''}:${spec.inversion || 0}:${spec.keyId || ''}`;
}

export function ReadIdentifyMode({
  soundOn,
  pianoSound,
  setStats,
  onScoreChange,
  hidden,
  tier = 'easy',
  onTierChange,
  fixedQuestion = null,
  questionEpoch = '',
  onQuestionComplete,
  onRoundSettled,
}) {
  const fixedKey = specKey(fixedQuestion);
  const fixedRef = useRef(fixedQuestion);
  fixedRef.current = fixedQuestion;
  const [question, setQuestion] = useState(() => (
    fixedQuestion
      ? (questionFromReadSpec(fixedQuestion) || generateReadQuestion({ tier }))
      : generateReadQuestion({ tier })
  ));
  const [feedback, setFeedback] = useState(null);
  const [picked, setPicked] = useState(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [liveMessage, setLiveMessage] = useState('');
  const streakRef = useRef(0);
  const advanceRoundRef = useRef(() => {});
  const settledWhileHidden = useRef(false);
  const { playChord } = usePiano(soundOn && !hidden, pianoSound);
  const { schedule, clearAll } = useTimeoutCleanup();
  const { t } = useI18n();

  useEffect(() => { streakRef.current = streak; }, [streak]);

  useEffect(() => {
    clearAll();
    const spec = fixedKey ? fixedRef.current : null;
    const next = spec?.root
      ? (questionFromReadSpec(spec) || generateReadQuestion({ tier }))
      : generateReadQuestion({ tier });
    setQuestion(next);
    setFeedback(null);
    setPicked(null);
    setLiveMessage('');
  }, [tier, fixedKey, questionEpoch, clearAll]);

  useEffect(() => {
    if (hidden) return;
    onScoreChange({ streak, correct: score.correct, total: score.total });
  }, [hidden, streak, score, onScoreChange]);

  const advanceAfter = useCallback((payload) => {
    const advance = () => {
      onRoundSettled?.(payload);
      if (onQuestionComplete) {
        onQuestionComplete(payload);
        return;
      }
      setQuestion((current) => generateReadQuestion({ tier, lastId: current?.id }));
      setFeedback(null);
      setPicked(null);
      setLiveMessage('');
    };
    advanceRoundRef.current = advance;
    schedule(advance, 1700);
  }, [onQuestionComplete, onRoundSettled, schedule, tier]);

  useEffect(() => {
    if (!feedback) {
      settledWhileHidden.current = false;
      return;
    }
    if (!hidden || settledWhileHidden.current) return;
    settledWhileHidden.current = true;
    clearAll();
    advanceRoundRef.current();
  }, [hidden, feedback, clearAll]);

  const missPayload = useCallback((missed, newStreak) => ({
    missed,
    skipped: false,
    streak: missed ? 0 : newStreak,
    skipRamp: true,
    question: {
      root: question.root,
      type: question.type,
      name: question.name,
      mode: 'read',
      inversion: question.inversion,
      keyId: question.keyId,
    },
  }), [question]);

  const choose = (quality) => {
    if (feedback) return;
    const correct = isReadAnswerCorrect(question, quality.id);
    playChord(question.voicing);
    if (correct) {
      const newStreak = computeStreakAfterSuccess(streakRef.current, false);
      setFeedback('correct');
      setPicked(quality.id);
      setLiveMessage(t('live.correctNamed', { name: t(question.labelKey) }));
      setStats((prev) => recordCorrectAttempt(prev, {
        chordName: question.name,
        newStreak,
      }));
      setStreak(newStreak);
      setScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
      advanceAfter(missPayload(false, newStreak));
      return;
    }
    setFeedback('wrong');
    setPicked(quality.id);
    setLiveMessage(t('read.reveal', { answer: t(question.labelKey) }));
    setStats((prev) => recordWrongAttempt(prev, question.name));
    setStreak(computeStreakAfterWrong());
    setScore((prev) => ({ ...prev, total: prev.total + 1 }));
    advanceAfter(missPayload(true, 0));
  };

  const changeTier = (nextTier) => {
    if (nextTier === tier || fixedKey) return;
    clearAll();
    onTierChange?.(nextTier);
  };

  const skip = () => {
    if (feedback) return;
    clearAll();
    const payload = {
      missed: false,
      skipped: true,
      streak: 0,
      skipRamp: true,
      question: {
        root: question.root,
        type: question.type,
        name: question.name,
        mode: 'read',
        inversion: question.inversion,
        keyId: question.keyId,
      },
    };
    setStreak(computeStreakAfterWrong());
    setScore((prev) => ({ ...prev, total: prev.total + 1 }));
    setStats((prev) => recordSkip(prev));
    onRoundSettled?.(payload);
    if (onQuestionComplete) {
      onQuestionComplete(payload);
      return;
    }
    setQuestion((current) => generateReadQuestion({ tier, lastId: current?.id }));
    setFeedback(null);
    setPicked(null);
    setLiveMessage(t('live.skipped'));
  };

  const choices = qualitiesForTier(tier);
  const triads = choices.filter((choice) => choice.group === 'triad');
  const sevenths = choices.filter((choice) => choice.group === 'seventh');
  const answerLabel = t(question.labelKey);
  const spelled = question.notes.map((note) => formatNoteName(note.name)).join(' – ');

  const renderChoice = (choice) => {
    const correct = Boolean(feedback) && choice.id === question.quality;
    const wrong = feedback === 'wrong' && picked === choice.id;
    return (
      <button
        key={choice.testId}
        type="button"
        data-testid={`read-choice-${choice.testId}`}
        disabled={Boolean(feedback)}
        onClick={() => choose(choice)}
        className="min-h-11 px-2 py-2 rounded-xl text-[13px] font-semibold leading-tight touch-none active:scale-[0.98] disabled:opacity-90"
        style={choiceStyle({ correct, wrong })}
      >
        {t(choice.labelKey)}
      </button>
    );
  };

  return (
    <div className={`mode-panel ${hidden ? 'mode-hidden' : ''}`} aria-hidden={hidden} inert={hidden ? true : undefined}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div className="text-center text-[11px] tracking-[0.22em] text-slate-500 font-semibold mb-1">
        {t('read.title')}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 mb-1">
        {READ_TIERS.map((item) => (
          <button
            key={item}
            type="button"
            data-testid={`read-tier-${item}`}
            aria-pressed={tier === item}
            onClick={() => changeTier(item)}
            className="px-3 py-1 rounded-full text-xs font-semibold touch-none active:scale-[0.98]"
            style={tierButtonStyle(tier === item)}
          >
            {t(`read.tier.${item}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center min-h-0 overflow-y-auto">
        <div
          key={question.id}
          className={`w-full max-w-md ${feedback === 'correct' ? 'chord-success' : ''} ${feedback === 'wrong' ? 'wrong-shake' : ''}`}
        >
          <StaffChord question={question} label={t('read.staff')} />
        </div>
        <div className="mt-1 mb-2 min-h-10 text-center px-3">
          {feedback === 'correct' && (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold uppercase">
                <Check size={12} aria-hidden="true" />
                <span>{answerLabel}</span>
                <Sparkles size={12} aria-hidden="true" />
              </div>
              <div className="text-slate-300 text-xs">{spelled}</div>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="flex flex-col items-center gap-0.5" data-testid="read-reveal">
              <div className="text-rose-200 text-sm font-semibold">
                {t('read.reveal', { answer: answerLabel })}
              </div>
              <div className="text-slate-300 text-xs">{spelled}</div>
            </div>
          )}
        </div>

        <div role="group" aria-label={t('read.choices')} className="w-full max-w-md px-1 pb-2">
          <div className="grid grid-cols-2 gap-1.5">
            {triads.map(renderChoice)}
          </div>
          {sevenths.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {sevenths.map((choice, index) => (
                <div key={choice.testId} className={index === sevenths.length - 1 && sevenths.length % 2 === 1 ? 'col-span-2' : undefined}>
                  {renderChoice(choice)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-2 pb-2 safe-bottom">
        <button type="button" onClick={skip} disabled={Boolean(feedback)} className="btn-action btn-neutral touch-none disabled:opacity-30">
          <SkipForward size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">{t('action.skip')}</span>
        </button>
      </div>
    </div>
  );
}
