import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ALL_KEYS, FULL_END, FULL_START, VISIBLE_WHITE_KEYS } from '../lib/constants.js';

export function Keyboard({
  pressed,
  lockedCorrect,
  wrongFlash,
  hintNotes,
  keyboardStart,
  onKey,
  onShiftKeyboard,
  disabled,
}) {
  const visibleKeys = useMemo(() => {
    const whites = ALL_KEYS.filter((k) => !k.isBlack && k.midi >= keyboardStart);
    const start = whites[0]?.midi ?? keyboardStart;
    const endWhite = whites[VISIBLE_WHITE_KEYS - 1];
    if (!endWhite) {
      return ALL_KEYS.filter((k) => k.midi >= start && k.midi <= FULL_END);
    }
    const end = Math.min(endWhite.midi + 12, FULL_END);
    return ALL_KEYS.filter((k) => k.midi >= start && k.midi <= end);
  }, [keyboardStart]);

  const visibleWhites = visibleKeys.filter((k) => !k.isBlack);
  const isKeyLocked = (midi) => lockedCorrect.has(midi % 12) && pressed.has(midi);
  const isHinted = (midi) => hintNotes && hintNotes.has(midi % 12) && !lockedCorrect.has(midi % 12);

  const keyLabel = (key) => `${key.name}${key.octave}`;

  return (
    <section aria-label="鋼琴鍵盤" className="keyboard-section">
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          aria-label="移動到較低音域"
          onClick={() => onShiftKeyboard(-1)}
          disabled={disabled || keyboardStart <= FULL_START}
          className="btn-octave disabled:opacity-30 touch-none"
        >
          <ChevronLeft size={12} className="text-slate-400" aria-hidden="true" />
          <span className="text-[10px] text-slate-500 tracking-wider uppercase">Lower</span>
        </button>
        <div className="text-[10px] tracking-[0.3em] text-slate-600 uppercase font-medium">
          Octave {Math.floor(keyboardStart / 12) - 1} – {Math.floor((keyboardStart + 12) / 12) - 1}
        </div>
        <button
          type="button"
          aria-label="移動到較高音域"
          onClick={() => onShiftKeyboard(1)}
          disabled={disabled || keyboardStart + 12 >= FULL_END - 11}
          className="btn-octave disabled:opacity-30 touch-none"
        >
          <span className="text-[10px] text-slate-500 tracking-wider uppercase">Higher</span>
          <ChevronRight size={12} className="text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <div className="relative w-full mb-3 keyboard-shell">
        <div className="absolute inset-0 rounded-2xl p-2 sm:p-2.5 keyboard-frame">
          <div className="relative w-full h-full flex">
            {visibleWhites.map((key) => {
              const locked = isKeyLocked(key.midi);
              const isWrong = wrongFlash === key.midi;
              const hinted = isHinted(key.midi);
              return (
                <button
                  key={key.midi}
                  type="button"
                  aria-label={keyLabel(key)}
                  disabled={disabled}
                  onMouseDown={() => onKey(key.midi)}
                  onTouchStart={(e) => { e.preventDefault(); onKey(key.midi); }}
                  className={`flex-1 relative rounded-b-xl transition-all duration-100 touch-none active:scale-[0.98] ${locked ? 'key-locked-white' : ''} ${isWrong ? 'wrong-shake' : ''} ${hinted ? 'key-hint-white' : ''}`}
                  style={{
                    background: isWrong
                      ? 'linear-gradient(180deg, #F7768E 0%, #c44e64 100%)'
                      : locked
                      ? 'linear-gradient(180deg, #B8F2D8 0%, #7ADCC8 60%, #4FB8A0 100%)'
                      : hinted
                      ? 'linear-gradient(180deg, #FFE7A8 0%, #F0D080 95%, #D0AF60 100%)'
                      : 'linear-gradient(180deg, #F0EEE8 0%, #D8D4CA 95%, #B8B4AA 100%)',
                    border: locked ? '1px solid rgba(122,220,200,0.6)' : '1px solid rgba(0,0,0,0.4)',
                    borderTop: locked ? '1px solid rgba(184,242,216,0.8)' : '1px solid rgba(255,255,255,0.5)',
                    marginRight: '2px',
                    boxShadow: locked ? undefined : 'inset 0 -8px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)',
                  }}
                />
              );
            })}
            <div className="absolute inset-0 flex pointer-events-none">
              {visibleWhites.map((wk, i) => {
                const blackKey = ALL_KEYS.find((k) => k.isBlack && k.midi === wk.midi + 1);
                const inRange = blackKey && visibleKeys.some((v) => v.midi === blackKey.midi);
                const isLast = i === visibleWhites.length - 1;
                if (!blackKey || !inRange || isLast) return <div key={wk.midi} className="flex-1" />;
                const locked = isKeyLocked(blackKey.midi);
                const isWrong = wrongFlash === blackKey.midi;
                const hinted = isHinted(blackKey.midi);
                return (
                  <div key={wk.midi} className="flex-1 relative">
                    <button
                      type="button"
                      aria-label={keyLabel(blackKey)}
                      disabled={disabled}
                      onMouseDown={() => onKey(blackKey.midi)}
                      onTouchStart={(e) => { e.preventDefault(); onKey(blackKey.midi); }}
                      className={`absolute pointer-events-auto rounded-b-lg transition-all duration-100 touch-none active:scale-[0.98] ${locked ? 'key-locked-black' : ''} ${isWrong ? 'wrong-shake' : ''} ${hinted ? 'key-hint-black' : ''}`}
                      style={{
                        width: '64%', height: '63%', right: '-32%', top: 0, zIndex: 10,
                        background: isWrong
                          ? 'linear-gradient(180deg, #F7768E 0%, #8a3d4f 100%)'
                          : locked
                          ? 'linear-gradient(180deg, #7ADCC8 0%, #3a9080 60%, #1f5e54 100%)'
                          : hinted
                          ? 'linear-gradient(180deg, #C9A050 0%, #5e4520 60%, #2e2210 100%)'
                          : 'linear-gradient(180deg, #2A2D38 0%, #15171F 50%, #08090E 100%)',
                        border: locked ? '1px solid rgba(122,220,200,0.6)' : '1px solid rgba(0,0,0,0.8)',
                        borderTop: locked ? '1px solid rgba(184,242,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: locked ? undefined : 'inset 0 -3px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 6px rgba(0,0,0,0.7)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
