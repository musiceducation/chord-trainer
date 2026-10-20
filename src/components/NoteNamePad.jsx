import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  NATURAL_LETTERS,
  canShiftSharedOctave,
  displayOctave,
  letterForPitchClass,
  midiForLetter,
} from '../lib/noteNames.js';
import { useI18n } from '../hooks/useI18n.jsx';

function pcsOf(notes) {
  if (!notes) return [];
  return [...notes].map((value) => ((value % 12) + 12) % 12);
}

export function NoteNamePad({
  pressed,
  lockedCorrect,
  wrongFlash,
  hintNotes,
  keyboardStart,
  onKey,
  onShiftKeyboard,
  disabled,
  compact = false,
}) {
  const { t } = useI18n();
  const [accidental, setAccidental] = useState(0);
  const lastTap = useRef(null);
  const spelled = useRef(new Map());
  const octave = displayOctave(keyboardStart);

  const toggleAccidental = (value) => {
    setAccidental((prev) => (prev === value ? 0 : value));
  };

  const playLetter = (letter) => {
    const midi = midiForLetter(letter, accidental, octave);
    const pc = ((midi % 12) + 12) % 12;
    spelled.current.set(pc, letter);
    lastTap.current = { letter, midi };
    onKey(midi);
    setAccidental(0);
  };

  const letterForLocked = (midi) => {
    const pc = ((midi % 12) + 12) % 12;
    return spelled.current.get(pc) || letterForPitchClass(pc);
  };

  const lockedLetter = (letter) => [...pressed].some((midi) => (
    lockedCorrect.has(((midi % 12) + 12) % 12) && letterForLocked(midi) === letter
  ));

  const hintedLetter = (letter) => {
    if (!hintNotes || lockedLetter(letter)) return false;
    return pcsOf(hintNotes).some((pc) => letterForPitchClass(pc) === letter && !lockedCorrect.has(pc));
  };

  const wrongLetter = wrongFlash == null
    ? null
    : (lastTap.current?.midi === wrongFlash
      ? lastTap.current.letter
      : letterForPitchClass(wrongFlash));

  const accidentalStyle = (armed) => ({
    background: armed
      ? 'linear-gradient(180deg, #3D4F7C 0%, #243056 100%)'
      : 'rgba(255,255,255,0.04)',
    color: armed ? '#E8EEFF' : '#C5D0E6',
    border: armed ? '1px solid rgba(122,162,247,0.75)' : '1px solid rgba(255,255,255,0.08)',
  });

  return (
    <section aria-label={t('keyboard.noteNames')} className={`keyboard-section ${compact ? 'keyboard-compact' : ''}`}>
      <div className="keyboard-octave-bar">
        <button
          type="button"
          aria-label={t('keyboard.lower')}
          onClick={() => onShiftKeyboard(-1)}
          disabled={disabled || !canShiftSharedOctave(keyboardStart, -1)}
          className="btn-octave disabled:opacity-30 touch-none"
        >
          <ChevronLeft size={12} className="text-slate-400" aria-hidden="true" />
          <span className="text-[10px] text-slate-500 tracking-wider uppercase">{t('keyboard.lowerLabel')}</span>
        </button>
        <div className="keyboard-octave-label">{t('keyboard.octaveN', { n: octave })}</div>
        <button
          type="button"
          aria-label={t('keyboard.higher')}
          onClick={() => onShiftKeyboard(1)}
          disabled={disabled || !canShiftSharedOctave(keyboardStart, 1)}
          className="btn-octave disabled:opacity-30 touch-none"
        >
          <span className="text-[10px] text-slate-500 tracking-wider uppercase">{t('keyboard.higherLabel')}</span>
          <ChevronRight size={12} className="text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <div className="note-name-pad">
        <div className="note-name-modifiers" role="group" aria-label={t('keyboard.noteNames')}>
          <button
            type="button"
            aria-label={t('noteNames.sharp')}
            aria-pressed={accidental === 1}
            disabled={disabled}
            onClick={() => toggleAccidental(1)}
            className="note-name-accidental touch-none active:scale-[0.98]"
            style={accidentalStyle(accidental === 1)}
          >
            #
          </button>
          <button
            type="button"
            aria-label={t('noteNames.flat')}
            aria-pressed={accidental === -1}
            disabled={disabled}
            onClick={() => toggleAccidental(-1)}
            className="note-name-accidental touch-none active:scale-[0.98]"
            style={accidentalStyle(accidental === -1)}
          >
            ♭
          </button>
        </div>
        <div className="note-name-row">
          {NATURAL_LETTERS.map((letter) => {
            const locked = lockedLetter(letter);
            const hinted = hintedLetter(letter);
            const isWrong = wrongLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                aria-label={letter}
                disabled={disabled}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  playLetter(letter);
                }}
                className={`note-name-key touch-none active:scale-[0.98] ${isWrong ? 'wrong-shake' : ''}`}
                style={{
                  background: isWrong
                    ? 'linear-gradient(180deg, #F7768E 0%, #c44e64 100%)'
                    : locked
                      ? 'linear-gradient(180deg, #B8F2D8 0%, #7ADCC8 100%)'
                      : hinted
                        ? 'linear-gradient(180deg, #FFE7A8 0%, #F0D080 100%)'
                        : 'linear-gradient(180deg, #F0EEE8 0%, #D8D4CA 100%)',
                  color: locked ? '#12382f' : hinted ? '#3a2c10' : isWrong ? '#F0F4FF' : '#1A1D2E',
                  border: locked ? '1px solid rgba(122,220,200,0.7)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
