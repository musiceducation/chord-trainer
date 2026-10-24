import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Keyboard } from '../components/Keyboard.jsx';
import { LookupMode } from '../components/LookupMode.jsx';
import { buildChordVoicing } from '../lib/chords.js';
import {
  LOOKUP_LOOP_GAP_MS,
  LOOKUP_QUEUE_MAX,
  appendLookupQueue,
  chordForLookupQueue,
  lookupFromPick,
  lookupFromSymbol,
  lookupLoopStep,
  parseChordSymbol,
  removeLookupQueueAt,
  runLookupLoop,
  supportedChordFormatList,
} from '../lib/chordLookup.js';
import { ALL_KEYS, CHORD_FORMULAS, DIFFICULTY_LEVELS, FULL_END, FULL_START } from '../lib/constants.js';
import { STRINGS } from '../lib/i18n.js';
import { visibleKeysForStart } from '../lib/keyboardRange.js';

function hintedLabels(html) {
  return [...html.matchAll(/aria-label="([^"]+)"(?=[^>]*key-hint-(?:white|black))/g)].map((match) => match[1]);
}

function labelsFor(midis) {
  return ALL_KEYS.filter((key) => midis.includes(key.midi)).map((key) => `${key.name}${key.octave}`);
}

function openTag(html, testId) {
  const match = html.match(new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`));
  return match?.[0] ?? '';
}

describe('chord symbol lookup', () => {
  it('parses symbols that map onto CHORD_FORMULAS', () => {
    expect(parseChordSymbol('F#sus2')).toEqual({ ok: true, root: 'F#', type: 'sus2', name: 'F#sus2' });
    expect(parseChordSymbol('Am7')).toEqual({ ok: true, root: 'A', type: 'm7', name: 'Am7' });
    expect(parseChordSymbol('am7')).toEqual({ ok: true, root: 'A', type: 'm7', name: 'Am7' });
    expect(parseChordSymbol('Cmaj7')).toEqual({ ok: true, root: 'C', type: 'maj7', name: 'Cmaj7' });
    expect(parseChordSymbol('C')).toEqual({ ok: true, root: 'C', type: '', name: 'C' });
    expect(parseChordSymbol('Bb7')).toEqual({ ok: true, root: 'Bb', type: '7', name: 'Bb7' });
    expect(parseChordSymbol('Ebdim7')).toEqual({ ok: true, root: 'Eb', type: 'dim7', name: 'Ebdim7' });
    expect(parseChordSymbol('G7b9')).toEqual({ ok: true, root: 'G', type: '7b9', name: 'G7b9' });
    expect(parseChordSymbol('Cm7b5')).toEqual({ ok: true, root: 'C', type: 'm7b5', name: 'Cm7b5' });
    expect(parseChordSymbol('  Cmaj9  ')).toEqual({ ok: true, root: 'C', type: 'maj9', name: 'Cmaj9' });
    expect(parseChordSymbol('Dbmaj7')).toMatchObject({ root: 'Db', type: 'maj7' });
  });

  it('rejects add9, slash chords, inversions, and other unsupported spellings', () => {
    const unsupported = [
      '',
      '   ',
      'Cadd9',
      'C9add',
      'C/E',
      'Am7/G',
      'Cmaj7/B',
      'Cmin',
      'C+',
      'C6',
      'H7',
      'C sus2',
      'CMaj7',
      'CM7',
    ];
    for (const symbol of unsupported) {
      const parsed = parseChordSymbol(symbol);
      expect(parsed.ok, symbol).toBe(false);
      const looked = lookupFromSymbol(symbol);
      expect(looked.ok, symbol).toBe(false);
      expect(looked.voicing, symbol).toBeUndefined();
    }
  });

  it('lists every formula in musical order and does not advertise out-of-scope spellings', () => {
    expect(supportedChordFormatList()).toBe(
      'major, m, dim, aug, sus2, sus4, maj7, m7, 7, m7b5, dim7, 7b9, 9, maj9',
    );
    expect(supportedChordFormatList().split(', ')).toEqual(
      DIFFICULTY_LEVELS.all.types.map((type) => type || 'major'),
    );
    expect(new Set(supportedChordFormatList().split(', '))).toEqual(
      new Set(Object.keys(CHORD_FORMULAS).map((type) => type || 'major')),
    );
    expect(supportedChordFormatList()).not.toMatch(/add9|slash|inversion|\//i);
  });

  it('returns one close voicing on the keyboard, not every octave of the pitch class', () => {
    for (const symbol of ['C', 'Am7', 'Cmaj7', 'F#sus2']) {
      const found = lookupFromSymbol(symbol);
      expect(found.ok, symbol).toBe(true);
      expect(found.voicing, symbol).toEqual(buildChordVoicing(found.root, found.type));
      expect(found.voicing, symbol).toHaveLength(CHORD_FORMULAS[found.type].intervals.length);
      const samePitchClass = ALL_KEYS.filter((key) => found.voicing.some((midi) => midi % 12 === key.pc));
      expect(samePitchClass.length, symbol).toBeGreaterThan(found.voicing.length);
    }

    const high = lookupFromSymbol('Bmaj9');
    expect(high.voicing).toEqual(buildChordVoicing('B', 'maj9', 48));
    expect(high.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END)).toBe(true);
    const shown = new Set(visibleKeysForStart(high.keyboardStart).map((key) => key.midi));
    expect(high.voicing.every((midi) => shown.has(midi))).toBe(true);

    const picked = lookupFromPick('F#', 'sus2');
    expect(picked.voicing).toEqual(lookupFromSymbol('F#sus2').voicing);
    expect(lookupFromPick('C', 'add9').ok).toBe(false);
  });

  it('highlights only the voicing MIDI notes on the shared keyboard', () => {
    for (const symbol of ['C', 'F#sus2', 'Am7']) {
      const found = lookupFromSymbol(symbol);
      const html = renderToStaticMarkup(createElement(Keyboard, {
        pressed: new Set(),
        lockedCorrect: new Set(),
        wrongFlash: null,
        hintNotes: new Set(found.voicing),
        keyboardStart: found.keyboardStart,
        onKey: () => {},
        onShiftKeyboard: () => {},
      }));
      expect(hintedLabels(html).sort(), symbol).toEqual(labelsFor(found.voicing).sort());
      expect(html).not.toContain('key-locked-white');
      expect(html).not.toContain('key-locked-black');
    }
  });

  it('renders root chips, quality chips, and one symbol field with no chord lit yet', () => {
    const html = renderToStaticMarkup(createElement(LookupMode, {
      soundOn: false,
      pianoSound: 'acoustic',
      hidden: false,
    }));
    expect(html).toContain('data-testid="lookup-panel"');
    expect(html).toContain('data-testid="lookup-symbol"');
    expect(html).toContain('data-testid="lookup-submit"');
    expect(html).toContain('>Look up<');
    expect(html).toContain('data-testid="lookup-root-F#"');
    expect(html).toContain('data-testid="lookup-quality-major"');
    expect(html).toContain('data-testid="lookup-quality-m7"');
    expect(html).toContain('data-testid="lookup-quality-sus2"');
    expect(html).toContain('data-testid="lookup-quality-maj7"');
    expect(html).toContain('>Major<');
    expect(html).toContain('Pick a root and quality, or type a symbol');
    expect(html).not.toContain('lookup-error');
    expect(html).not.toContain('key-hint-white');
    expect(html).not.toContain('key-hint-black');
    expect(html).not.toContain('>Skip<');
    expect(html).not.toContain('>Perfect<');
    expect(html).not.toContain('data-testid="ear-quality-pool"');
    expect(openTag(html, 'lookup-queue-add')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-play')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-stop')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-clear')).toContain('disabled');
    expect(html).toContain('data-testid="lookup-queue-list"');
    expect(html).not.toContain('data-testid="lookup-queue-item-0"');
    expect(html).toContain('>Add<');
    expect(html).toContain('>Play<');
    expect(html).toContain('>Stop<');
    expect(html).toContain('Add chords to loop them');
    expect(STRINGS.en['lookup.queuePlay']).toBe('Play');
    expect(STRINGS['zh-Hant']['lookup.queue']).toBe('循環');
    expect(STRINGS['zh-Hant']['lookup.queueAdd']).toBe('加入');
    expect(STRINGS['zh-Hant']['lookup.queueStop']).toBe('停止');
    expect(STRINGS['zh-Hant']['lookup.queueClear']).toBe('清除');
    expect(STRINGS['zh-Hant']['lookup.queueEmpty']).toBe('加入和弦後可循環播放');
    expect(STRINGS['zh-Hans']['lookup.queue']).toBe('循环');
    expect(STRINGS['zh-Hans']['lookup.queueRemove']).toBe('移除 {name}');
  });
});

describe('lookup loop queue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues resolved chords only, up to 8, and keeps a copy of the voicing', () => {
    expect(LOOKUP_LOOP_GAP_MS).toBe(1200);
    expect(LOOKUP_QUEUE_MAX).toBe(8);

    const found = lookupFromSymbol('Am7');
    const queued = chordForLookupQueue(found);
    expect(queued).toMatchObject({
      root: 'A',
      type: 'm7',
      name: 'Am7',
      keyboardStart: found.keyboardStart,
    });
    expect(queued.voicing).toEqual(found.voicing);
    expect(queued.voicing).not.toBe(found.voicing);

    expect(chordForLookupQueue(lookupFromSymbol('C/E'))).toBeNull();
    expect(chordForLookupQueue(lookupFromSymbol('Cadd9'))).toBeNull();
    expect(chordForLookupQueue(lookupFromSymbol('C6'))).toBeNull();
    expect(chordForLookupQueue({
      ok: true,
      root: 'C',
      type: 'add9',
      name: 'Cadd9',
      voicing: [60, 64, 67, 74],
      keyboardStart: 48,
    })).toBeNull();
    expect(appendLookupQueue([], lookupFromSymbol('C/E'))).toEqual([]);

    const symbols = ['C', 'Am7', 'F#sus2', 'Bb7', 'Ebdim7', 'G7b9', 'Cm7b5', 'Cmaj9'];
    let queue = [];
    for (const symbol of symbols) {
      queue = appendLookupQueue(queue, lookupFromSymbol(symbol));
    }
    expect(queue.map((item) => item.name)).toEqual(symbols);
    const blocked = appendLookupQueue(queue, lookupFromSymbol('Dm'));
    expect(blocked).toBe(queue);

    const removed = removeLookupQueueAt(queue, 1);
    expect(removed.map((item) => item.name)).toEqual(['C', 'F#sus2', 'Bb7', 'Ebdim7', 'G7b9', 'Cm7b5', 'Cmaj9']);
    expect(removeLookupQueueAt(queue, -1)).toBe(queue);
    expect(removeLookupQueueAt(queue, 99)).toBe(queue);
  });

  it('walks the queue from the start and wraps', () => {
    const queue = ['C', 'Am7', 'F#sus2'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    expect(lookupLoopStep([], 0)).toBeNull();
    const first = lookupLoopStep(queue, 0);
    const second = lookupLoopStep(queue, first.nextCursor);
    const third = lookupLoopStep(queue, second.nextCursor);
    const fourth = lookupLoopStep(queue, third.nextCursor);
    expect([first, second, third, fourth].map((step) => step.chord.name)).toEqual(['C', 'Am7', 'F#sus2', 'C']);
    expect(fourth.index).toBe(0);
  });

  it('plays each queued chord every 1200ms until stop, and drops an emptied queue', () => {
    vi.useFakeTimers();
    const queue = ['C', 'Am7', 'F#sus2'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    const shown = [];
    const played = [];
    let current = queue;
    const cleared = [];
    const stop = runLookupLoop({
      getQueue: () => current,
      onChord: (step) => { shown.push(step ? step.chord.name : null); },
      play: (chord) => { played.push(chord.name); },
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (id) => {
        cleared.push(id);
        clearTimeout(id);
      },
    });

    expect(shown).toEqual([]);
    vi.advanceTimersToNextTimer();
    expect(shown).toEqual(['C']);
    expect(played).toEqual(['C']);

    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS - 1);
    expect(played).toEqual(['C']);
    vi.advanceTimersByTime(1);
    expect(played).toEqual(['C', 'Am7']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['C', 'Am7', 'F#sus2']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['C', 'Am7', 'F#sus2', 'C']);

    current = [...queue, chordForLookupQueue(lookupFromSymbol('Bb7'))];
    const beforeAdded = played.length;
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 4);
    expect(played.slice(beforeAdded)).toContain('Bb7');

    stop();
    const playedCount = played.length;
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 4);
    expect(played).toHaveLength(playedCount);
    expect(cleared.length).toBeGreaterThan(0);

    const missed = [];
    const cancelImmediately = runLookupLoop({
      getQueue: () => queue,
      onChord: () => { missed.push('shown'); },
      play: () => { missed.push('played'); },
    });
    cancelImmediately();
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(missed).toEqual([]);

    const ended = [];
    current = queue;
    runLookupLoop({
      getQueue: () => current,
      onChord: (step) => { ended.push(step ? step.chord.name : 'end'); },
      play: () => {},
    });
    vi.advanceTimersToNextTimer();
    current = [];
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(ended).toEqual(['C', 'end']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(ended).toEqual(['C', 'end']);
  });

  it('waits one gap when chord 0 was already attacked in the tap', () => {
    vi.useFakeTimers();
    const queue = ['C', 'Am7'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    const played = [];
    const stop = runLookupLoop({
      getQueue: () => queue,
      startCursor: 1,
      initialDelayMs: LOOKUP_LOOP_GAP_MS,
      onChord: () => {},
      play: (chord) => { played.push(chord.name); },
    });
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS - 1);
    expect(played).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(played).toEqual(['Am7']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['Am7', 'C']);
    stop();
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(played).toEqual(['Am7', 'C']);
  });
});
