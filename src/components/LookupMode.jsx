import { useMemo, useState } from 'react';
import { Keyboard } from './Keyboard.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { chordTypeI18nKey } from '../lib/chords.js';
import { lookupFromPick, lookupFromSymbol } from '../lib/chordLookup.js';
import { CHORD_FORMULAS, ROOTS } from '../lib/constants.js';
import { canShiftKeyboard } from '../lib/keyboardRange.js';
import { useI18n } from '../hooks/useI18n.jsx';

const EMPTY_NOTES = new Set();
const QUALITY_TYPES = Object.keys(CHORD_FORMULAS);

function chipStyle(active) {
  return {
    background: active
      ? 'linear-gradient(135deg, rgba(240,208,128,0.22), rgba(240,208,128,0.08))'
      : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(240,208,128,0.55)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#FFE7A8' : '#565F89',
    fontWeight: active ? 700 : 500,
  };
}

function qualityDomId(type) {
  return type === '' ? 'major' : type;
}

export function LookupMode({ soundOn, pianoSound, hidden }) {
  const { t } = useI18n();
  const { playNote, playChord } = usePiano(soundOn && !hidden, pianoSound);
  const [root, setRoot] = useState(null);
  const [type, setType] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState('');
  const [voicing, setVoicing] = useState(null);
  const [keyboardStart, setKeyboardStart] = useState(48);
  const hintNotes = useMemo(() => (voicing ? new Set(voicing) : null), [voicing]);

  const reveal = (next) => {
    setRoot(next.root);
    setType(next.type);
    setSymbol(next.name);
    setError('');
    setVoicing(next.voicing);
    setKeyboardStart(next.keyboardStart);
    if (soundOn && !hidden) playChord(next.voicing);
  };

  const fail = (formats) => {
    setRoot(null);
    setType(null);
    setVoicing(null);
    setError(t('lookup.error', { formats }));
  };

  const pickRoot = (nextRoot) => {
    if (type == null) {
      setRoot(nextRoot);
      setSymbol('');
      setError('');
      return;
    }
    const next = lookupFromPick(nextRoot, type);
    if (!next.ok) {
      fail(next.formats);
      return;
    }
    reveal(next);
  };

  const pickQuality = (nextType) => {
    if (root == null) {
      setType(nextType);
      setSymbol('');
      setError('');
      return;
    }
    const next = lookupFromPick(root, nextType);
    if (!next.ok) {
      fail(next.formats);
      return;
    }
    reveal(next);
  };

  const submitSymbol = (event) => {
    event.preventDefault();
    const next = lookupFromSymbol(symbol);
    if (!next.ok) {
      fail(next.formats);
      return;
    }
    reveal(next);
  };

  const shiftKeyboard = (direction) => {
    if (!canShiftKeyboard(keyboardStart, direction, false)) return;
    setKeyboardStart((start) => start + direction * 12);
  };

  const ready = root != null && type != null;

  return (
    <div
      className={`mode-panel ${hidden ? 'mode-hidden' : ''}`}
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
      data-testid="lookup-panel"
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="text-center mb-3 min-h-[4.5rem]">
          {ready ? (
            <>
              <div className="text-[10px] tracking-[0.35em] text-slate-500 uppercase mb-1 font-medium">
                {t(chordTypeI18nKey(type))}
              </div>
              <div
                data-testid="lookup-chord-name"
                className="display-font font-black leading-none tracking-tight text-[#DCE7FF]"
                style={{ fontSize: 'clamp(40px, 12vw, 72px)' }}
              >
                {root + type}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 leading-relaxed px-2 pt-3">{t('lookup.prompt')}</p>
          )}
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-[0.25em] mb-1.5 font-semibold">
          {t('lookup.root')}
        </div>
        <div className="grid grid-cols-6 gap-1.5 mb-3" role="group" aria-label={t('lookup.root')}>
          {ROOTS.map((note) => {
            const active = root === note;
            return (
              <button
                key={note}
                type="button"
                aria-pressed={active}
                data-testid={`lookup-root-${note}`}
                onClick={() => pickRoot(note)}
                className="py-2 rounded-xl text-sm transition-all touch-none active:scale-[0.98]"
                style={chipStyle(active)}
              >
                {note}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-[0.25em] mb-1.5 font-semibold">
          {t('lookup.quality')}
        </div>
        <div
          className="flex flex-wrap gap-1.5 mb-3"
          role="group"
          aria-label={t('lookup.quality')}
          data-testid="lookup-qualities"
        >
          {QUALITY_TYPES.map((quality) => {
            const active = type === quality;
            return (
              <button
                key={qualityDomId(quality)}
                type="button"
                aria-pressed={active}
                data-testid={`lookup-quality-${qualityDomId(quality)}`}
                onClick={() => pickQuality(quality)}
                className="px-2.5 py-1.5 rounded-full text-[11px] touch-none active:scale-[0.98]"
                style={chipStyle(active)}
              >
                {t(chordTypeI18nKey(quality))}
              </button>
            );
          })}
        </div>

        <form onSubmit={submitSymbol} className="flex gap-1.5 items-center">
          <input
            data-testid="lookup-symbol"
            value={symbol}
            onChange={(event) => {
              setSymbol(event.target.value);
              setError('');
            }}
            placeholder={t('lookup.symbolPlaceholder')}
            aria-label={t('lookup.symbol')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'lookup-error' : undefined}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 outline-none"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${error ? 'rgba(247,118,142,0.65)' : 'rgba(255,255,255,0.08)'}`,
            }}
          />
          <button
            type="submit"
            data-testid="lookup-submit"
            className="shrink-0 px-3 py-2.5 rounded-xl text-sm font-semibold touch-none active:scale-[0.98]"
            style={chipStyle(true)}
          >
            {t('lookup.submit')}
          </button>
        </form>
        {error ? (
          <p
            id="lookup-error"
            role="alert"
            data-testid="lookup-error"
            className="text-rose-300 text-xs leading-relaxed mt-2 font-medium"
          >
            {error}
          </p>
        ) : null}
      </div>

      <Keyboard
        pressed={EMPTY_NOTES}
        lockedCorrect={EMPTY_NOTES}
        wrongFlash={null}
        hintNotes={hintNotes}
        keyboardStart={keyboardStart}
        onKey={(midi) => { if (soundOn) playNote(midi); }}
        onShiftKeyboard={shiftKeyboard}
        disabled={false}
      />
    </div>
  );
}
