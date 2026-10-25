import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from './Keyboard.jsx';
import { usePiano } from '../hooks/usePiano.js';
import { chordTypeI18nKey } from '../lib/chords.js';
import {
  LOOKUP_LOOP_GAP_MS,
  LOOKUP_QUALITY_TYPES,
  LOOKUP_QUEUE_MAX,
  chordForLookupQueue,
  lookupFromPick,
  lookupFromSymbol,
  removeLookupQueueAt,
  runLookupLoop,
} from '../lib/chordLookup.js';
import { ROOTS } from '../lib/constants.js';
import { canShiftKeyboard } from '../lib/keyboardRange.js';
import { useI18n } from '../hooks/useI18n.jsx';

const EMPTY_NOTES = new Set();

/** Lookup lights a resolved voicing with Identify's solid mint, not hint gold. */
export function lookupPianoHighlight(voicing) {
  if (!voicing?.length) {
    return { pressed: EMPTY_NOTES, lockedCorrect: EMPTY_NOTES, hintNotes: null };
  }
  return {
    pressed: new Set(voicing),
    lockedCorrect: new Set(voicing.map((midi) => ((midi % 12) + 12) % 12)),
    hintNotes: null,
  };
}

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
  const [bass, setBass] = useState(null);
  const [voicing, setVoicing] = useState(null);
  const [keyboardStart, setKeyboardStart] = useState(48);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loopRun, setLoopRun] = useState(0);
  const pianoHighlight = useMemo(() => lookupPianoHighlight(voicing), [voicing]);
  const nextQueueId = useRef(1);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const queueEmpty = queue.length === 0;

  const stopLoop = () => {
    setPlaying(false);
    setActiveIndex(-1);
  };

  const reveal = (next) => {
    stopLoop();
    setRoot(next.root);
    setType(next.type);
    setBass(next.bass || null);
    setSymbol(next.name);
    setError('');
    setVoicing(next.voicing);
    setKeyboardStart(next.keyboardStart);
    if (soundOn && !hidden && next.voicing?.length) playChord(next.voicing);
  };

  const fail = (formats) => {
    stopLoop();
    setRoot(null);
    setType(null);
    setBass(null);
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

  const addCurrent = () => {
    if (root == null || type == null || queue.length >= LOOKUP_QUEUE_MAX) return;
    const name = bass ? `${root}${type}/${bass}` : `${root}${type}`;
    const draft = chordForLookupQueue({
      ok: true,
      root,
      type,
      bass,
      name,
      voicing,
      keyboardStart,
    });
    if (!draft) return;
    const id = nextQueueId.current;
    nextQueueId.current += 1;
    setQueue((prev) => (
      prev.length >= LOOKUP_QUEUE_MAX ? prev : [...prev, { ...draft, id }]
    ));
  };

  const removeAt = (index) => {
    setQueue((prev) => removeLookupQueueAt(prev, index));
    setActiveIndex((current) => {
      if (current < 0 || current < index) return current;
      if (current === index) return -1;
      return current - 1;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    stopLoop();
  };

  const showChord = (chord) => {
    setRoot(chord.root);
    setType(chord.type);
    setBass(chord.bass || null);
    setError('');
    setVoicing(chord.voicing);
    setKeyboardStart(chord.keyboardStart);
  };

  const playQueue = () => {
    if (queueEmpty || !soundOn || hidden) return;
    const first = queue[0];
    if (!first) return;
    // Attack chord 0 inside the tap so WKWebView can resume the audio context.
    // The effect plays the rest of the loop one gap later.
    setActiveIndex(0);
    showChord(first);
    playChord(first.voicing);
    setPlaying(true);
    setLoopRun((n) => n + 1);
  };

  useEffect(() => {
    if (!playing) return undefined;
    if (hidden || !soundOn || queueEmpty) {
      setPlaying(false);
      setActiveIndex(-1);
      return undefined;
    }

    let alive = true;
    const stop = runLookupLoop({
      getQueue: () => queueRef.current,
      startCursor: 1,
      initialDelayMs: LOOKUP_LOOP_GAP_MS,
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (id) => window.clearTimeout(id),
      onChord(step) {
        if (!alive) return;
        if (!step) {
          setPlaying(false);
          setActiveIndex(-1);
          return;
        }
        setActiveIndex(step.index);
        showChord(step.chord);
      },
      play(chord) {
        if (!alive) return;
        playChord(chord.voicing);
      },
    });

    return () => {
      alive = false;
      stop();
    };
  }, [playing, hidden, soundOn, loopRun, playChord, queueEmpty]);

  const ready = root != null && type != null;
  const chordName = ready ? (bass ? `${root}${type}/${bass}` : `${root}${type}`) : '';
  const canAdd = ready && Array.isArray(voicing) && voicing.length > 0 && queue.length < LOOKUP_QUEUE_MAX;
  const canPlay = !queueEmpty && soundOn && !hidden;

  return (
    <div
      className={`mode-panel ${hidden ? 'mode-hidden' : ''}`}
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
      data-testid="lookup-panel"
    >
      <div className="shrink-0 text-center mb-2 min-h-[3.25rem]">
        {ready ? (
          <>
            <div className="text-[10px] tracking-[0.35em] text-slate-500 uppercase mb-1 font-medium">
              {t(chordTypeI18nKey(type))}
            </div>
            <div
              data-testid="lookup-chord-name"
              className="display-font font-black leading-none tracking-tight text-[#DCE7FF]"
              style={{ fontSize: 'clamp(32px, 10vw, 56px)' }}
            >
              {chordName}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 leading-relaxed px-2 pt-2">{t('lookup.prompt')}</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
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
          {LOOKUP_QUALITY_TYPES.map((quality) => {
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
      </div>

      <form onSubmit={submitSymbol} className="shrink-0 flex gap-1.5 items-center mt-2">
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
          className="shrink-0 text-rose-300 text-xs leading-relaxed mt-2 font-medium"
        >
          {error}
        </p>
      ) : null}

      <div className="shrink-0 mt-2" data-testid="lookup-queue">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-[0.25em] font-semibold shrink-0">
            {t('lookup.queue')}
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-1.5">
            <button
              type="button"
              data-testid="lookup-queue-add"
              disabled={!canAdd}
              title={queue.length >= LOOKUP_QUEUE_MAX ? t('lookup.queueFull', { max: LOOKUP_QUEUE_MAX }) : undefined}
              onClick={addCurrent}
              className="px-2.5 py-1.5 rounded-full text-[11px] touch-none active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100"
              style={chipStyle(canAdd)}
            >
              {t('lookup.queueAdd')}
            </button>
            <button
              type="button"
              data-testid="lookup-queue-play"
              disabled={!canPlay}
              aria-pressed={playing}
              onClick={playQueue}
              className="px-2.5 py-1.5 rounded-full text-[11px] touch-none active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100"
              style={chipStyle(canPlay)}
            >
              {t('lookup.queuePlay')}
            </button>
            <button
              type="button"
              data-testid="lookup-queue-stop"
              disabled={!playing}
              onClick={stopLoop}
              className="px-2.5 py-1.5 rounded-full text-[11px] touch-none active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100"
              style={chipStyle(playing)}
            >
              {t('lookup.queueStop')}
            </button>
            <button
              type="button"
              data-testid="lookup-queue-clear"
              disabled={queueEmpty}
              onClick={clearQueue}
              className="px-2.5 py-1.5 rounded-full text-[11px] touch-none active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100"
              style={chipStyle(false)}
            >
              {t('lookup.queueClear')}
            </button>
          </div>
        </div>
        <div
          className="flex flex-wrap gap-1.5 min-h-[1.75rem] items-center"
          data-testid="lookup-queue-list"
          role={queue.length ? 'list' : undefined}
          aria-label={queue.length ? t('lookup.queue') : undefined}
        >
          {queue.length === 0 ? (
            <p className="text-[11px] text-slate-500 leading-snug">{t('lookup.queueEmpty')}</p>
          ) : queue.map((item, index) => {
            const current = playing && activeIndex === index;
            return (
              <span
                key={item.id}
                role="listitem"
                data-testid={`lookup-queue-item-${index}`}
                data-playing={current ? 'true' : undefined}
                aria-current={current ? 'step' : undefined}
                className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-full text-[11px]"
                style={chipStyle(current)}
              >
                <span>{item.name}</span>
                <button
                  type="button"
                  data-testid={`lookup-queue-remove-${index}`}
                  aria-label={t('lookup.queueRemove', { name: item.name })}
                  onClick={() => removeAt(index)}
                  className="w-5 h-5 rounded-full text-[13px] leading-none text-slate-400 touch-none"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <Keyboard
        compact
        pressed={pianoHighlight.pressed}
        lockedCorrect={pianoHighlight.lockedCorrect}
        wrongFlash={null}
        hintNotes={pianoHighlight.hintNotes}
        keyboardStart={keyboardStart}
        onKey={(midi) => { if (soundOn) playNote(midi); }}
        onShiftKeyboard={shiftKeyboard}
        disabled={false}
      />
    </div>
  );
}
