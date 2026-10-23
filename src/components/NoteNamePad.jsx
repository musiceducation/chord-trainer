import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  NATURAL_LETTERS,
  blackKeyButtons,
  canShiftSharedOctave,
  displayOctave,
  midiInDisplayOctave,
  pitchClassForLetter,
} from '../lib/noteNames.js';
import { useI18n } from '../hooks/useI18n.jsx';

function pcOf(value) {
  return ((value % 12) + 12) % 12;
}

function pcsOf(notes) {
  if (!notes) return [];
  return [...notes].map((value) => pcOf(value));
}

function keyFace({ locked, hinted, wrong, black }) {
  if (wrong) {
    return {
      background: 'linear-gradient(180deg, #F7768E 0%, #c44e64 100%)',
      color: '#F0F4FF',
      border: '1px solid rgba(255,255,255,0.08)',
    };
  }
  if (locked) {
    return {
      background: 'linear-gradient(180deg, #B8F2D8 0%, #7ADCC8 100%)',
      color: '#12382f',
      border: '1px solid rgba(122,220,200,0.7)',
    };
  }
  if (hinted) {
    return {
      background: 'linear-gradient(180deg, #FFE7A8 0%, #F0D080 100%)',
      color: '#3a2c10',
      border: '1px solid rgba(255,255,255,0.08)',
    };
  }
  if (black) {
    return {
      background: 'linear-gradient(180deg, #3A4464 0%, #1C2236 100%)',
      color: '#E8EEFF',
      border: '1px solid rgba(255,255,255,0.14)',
    };
  }
  return {
    background: 'linear-gradient(180deg, #F0EEE8 0%, #D8D4CA 100%)',
    color: '#1A1D2E',
    border: '1px solid rgba(255,255,255,0.08)',
  };
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
  accidentalSpelling = 'sharp',
}) {
  const { t } = useI18n();
  const octave = displayOctave(keyboardStart);
  const blackKeys = blackKeyButtons(accidentalSpelling === 'flat' ? 'flat' : 'sharp');
  const pressedPcs = new Set(pcsOf(pressed));
  const wrongPc = wrongFlash == null ? null : pcOf(wrongFlash);

  const lockedPc = (pc) => lockedCorrect?.has(pc) && pressedPcs.has(pc);
  const hintedPc = (pc) => {
    if (!hintNotes || lockedPc(pc)) return false;
    return pcsOf(hintNotes).includes(pc) && !lockedCorrect?.has(pc);
  };

  const playPc = (pc) => {
    if (disabled) return;
    onKey(midiInDisplayOctave(pc, octave));
  };

  const renderKey = (label, pc, black) => {
    const locked = lockedPc(pc);
    const hinted = hintedPc(pc);
    const isWrong = wrongPc === pc;
    return (
      <button
        key={label}
        type="button"
        aria-label={label}
        aria-pressed={locked || undefined}
        aria-disabled={disabled || undefined}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          event.preventDefault();
          playPc(pc);
        }}
        className={`piano-key touch-none active:scale-[0.98] ${black ? 'note-name-black' : 'note-name-key'} ${isWrong ? 'wrong-shake' : ''}`}
        style={keyFace({ locked, hinted, wrong: isWrong, black })}
      >
        {label}
      </button>
    );
  };

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
        <div className="note-name-black-row">
          {blackKeys.map((key) => renderKey(key.label, key.pc, true))}
        </div>
        <div className="note-name-row">
          {NATURAL_LETTERS.map((letter) => renderKey(letter, pitchClassForLetter(letter), false))}
        </div>
      </div>
    </section>
  );
}
