import { useMemo } from 'react';
import { visibleKeysForStart } from '../lib/keyboardRange.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { OctaveShiftBar } from './Keyboard.jsx';

export function NoteNamePad({
  pressed,
  lockedCorrect,
  wrongFlash,
  hintNotes,
  keyboardStart,
  onKey,
  onShiftKeyboard,
  disabled,
  wide = false,
  compact = false,
}) {
  const { t } = useI18n();
  const visibleKeys = useMemo(
    () => visibleKeysForStart(keyboardStart, wide),
    [keyboardStart, wide],
  );
  const startOct = visibleKeys[0]?.octave ?? 0;
  const endOct = visibleKeys[visibleKeys.length - 1]?.octave ?? startOct;

  const isKeyLocked = (midi) => lockedCorrect.has(midi % 12) && pressed.has(midi);
  const isHinted = (midi) => {
    if (!hintNotes || lockedCorrect.has(midi % 12)) return false;
    if (hintNotes.has(midi)) return true;
    return hintNotes.has(midi % 12);
  };

  return (
    <section aria-label={t('keyboard.noteNames')} className={`keyboard-section ${compact ? 'keyboard-compact' : ''}`}>
      <OctaveShiftBar
        keyboardStart={keyboardStart}
        wide={wide}
        disabled={disabled}
        onShiftKeyboard={onShiftKeyboard}
        startOct={startOct}
        endOct={endOct}
      />
      <div className="note-name-pad">
        {visibleKeys.map((key) => {
          const locked = isKeyLocked(key.midi);
          const isWrong = wrongFlash === key.midi;
          const hinted = isHinted(key.midi);
          return (
            <button
              key={key.midi}
              type="button"
              aria-label={`${key.name}${key.octave}`}
              disabled={disabled}
              onMouseDown={() => onKey(key.midi)}
              onTouchStart={(e) => { e.preventDefault(); onKey(key.midi); }}
              className={`note-name-key touch-none active:scale-[0.98] ${key.isBlack ? 'note-name-black' : 'note-name-white'} ${isWrong ? 'wrong-shake' : ''}`}
              style={{
                background: isWrong
                  ? 'linear-gradient(180deg, #F7768E 0%, #c44e64 100%)'
                  : locked
                    ? 'linear-gradient(180deg, #B8F2D8 0%, #7ADCC8 100%)'
                    : hinted
                      ? 'linear-gradient(180deg, #FFE7A8 0%, #F0D080 100%)'
                      : key.isBlack
                        ? 'linear-gradient(180deg, #2A2D38 0%, #15171F 100%)'
                        : 'linear-gradient(180deg, #F0EEE8 0%, #D8D4CA 100%)',
                color: locked ? '#12382f' : hinted ? '#3a2c10' : key.isBlack || isWrong ? '#F0F4FF' : '#1A1D2E',
                border: locked ? '1px solid rgba(122,220,200,0.7)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {key.name}
              <span className="note-name-oct">{key.octave}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
