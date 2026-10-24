import { buildChordVoicing } from './chords.js';
import {
  CHORD_FORMULAS,
  DIFFICULTY_LEVELS,
  FULL_END,
  FULL_START,
  NOTE_TO_PC,
} from './constants.js';
import { keyboardStartContaining } from './keyboardRange.js';

/**
 * Musical order from the shared formula list.
 * `Object.keys(CHORD_FORMULAS)` is not safe: "7" and "9" are integer indexes
 * and would sort ahead of every other quality.
 */
const FORMULA_KEYS = new Set(Object.keys(CHORD_FORMULAS));
export const LOOKUP_QUALITY_TYPES = [
  ...DIFFICULTY_LEVELS.all.types.filter((type) => FORMULA_KEYS.has(type)),
  ...Object.keys(CHORD_FORMULAS).filter((type) => !DIFFICULTY_LEVELS.all.types.includes(type)),
];

const SYMBOL = /^([A-Ga-g])([#b♯♭])?(.*)$/;

/**
 * Symbols whose suffix is exactly a `CHORD_FORMULAS` key.
 * Major is the empty suffix (`C`). No add9, slash bass, or inversion spelling.
 */
export function parseChordSymbol(raw) {
  const text = String(raw ?? '').trim();
  if (!text || /\s/.test(text)) return { ok: false };
  const match = text.match(SYMBOL);
  if (!match) return { ok: false };
  let accidental = match[2] || '';
  if (accidental === '♯') accidental = '#';
  if (accidental === '♭') accidental = 'b';
  const root = match[1].toUpperCase() + accidental;
  const type = match[3];
  if (!Object.prototype.hasOwnProperty.call(NOTE_TO_PC, root)) return { ok: false };
  if (!Object.prototype.hasOwnProperty.call(CHORD_FORMULAS, type)) return { ok: false };
  return { ok: true, root, type, name: root + type };
}

/** Comma-separated formula names for the inline parse error. Major is spelled out. */
export function supportedChordFormatList() {
  return LOOKUP_QUALITY_TYPES.map((type) => type || 'major').join(', ');
}

/**
 * One close voicing. Prefers the same MIDI 60 register as practice playback,
 * and drops an octave only when a tone would fall off the on-screen keyboard.
 */
export function lookupVoicing(root, type) {
  for (const baseMidi of [60, 48, 36]) {
    const midis = buildChordVoicing(root, type, baseMidi);
    if (midis.length && midis.every((midi) => midi >= FULL_START && midi <= FULL_END)) {
      return midis;
    }
  }
  return buildChordVoicing(root, type, 48).filter((midi) => midi >= FULL_START && midi <= FULL_END);
}

function resolved(root, type) {
  const voicing = lookupVoicing(root, type);
  return {
    ok: true,
    root,
    type,
    name: root + type,
    voicing,
    keyboardStart: keyboardStartContaining(voicing),
  };
}

export function lookupFromSymbol(raw) {
  const parsed = parseChordSymbol(raw);
  if (!parsed.ok) return { ok: false, formats: supportedChordFormatList() };
  return resolved(parsed.root, parsed.type);
}

export function lookupFromPick(root, type) {
  if (!Object.prototype.hasOwnProperty.call(NOTE_TO_PC, root)) {
    return { ok: false, formats: supportedChordFormatList() };
  }
  if (!Object.prototype.hasOwnProperty.call(CHORD_FORMULAS, type)) {
    return { ok: false, formats: supportedChordFormatList() };
  }
  return resolved(root, type);
}

/** Milliseconds between Lookup loop attacks. Fixed for v1; no tempo control. */
export const LOOKUP_LOOP_GAP_MS = 1200;

/** Ordered Lookup loop length. Chips stay on a short wrapping row. */
export const LOOKUP_QUEUE_MAX = 8;

/**
 * Snapshot of a resolved lookup chord for the queue.
 * Rejects anything outside the current root + `CHORD_FORMULAS` set.
 */
export function chordForLookupQueue(resolved) {
  if (!resolved?.ok) return null;
  if (!Object.prototype.hasOwnProperty.call(NOTE_TO_PC, resolved.root)) return null;
  if (!Object.prototype.hasOwnProperty.call(CHORD_FORMULAS, resolved.type)) return null;
  if (!Array.isArray(resolved.voicing) || resolved.voicing.length === 0) return null;
  const voicing = resolved.voicing.slice();
  return {
    root: resolved.root,
    type: resolved.type,
    name: typeof resolved.name === 'string' && resolved.name
      ? resolved.name
      : resolved.root + resolved.type,
    voicing,
    keyboardStart: Number.isFinite(resolved.keyboardStart)
      ? resolved.keyboardStart
      : keyboardStartContaining(voicing),
  };
}

export function appendLookupQueue(queue, resolved, max = LOOKUP_QUEUE_MAX) {
  if (!Array.isArray(queue) || queue.length >= max) return Array.isArray(queue) ? queue : [];
  const item = chordForLookupQueue(resolved);
  if (!item) return queue;
  return [...queue, item];
}

export function removeLookupQueueAt(queue, index) {
  if (!Array.isArray(queue)) return [];
  if (!Number.isInteger(index) || index < 0 || index >= queue.length) return queue;
  return queue.filter((_, i) => i !== index);
}

/**
 * Next attack. `cursor` counts attacks from 0 and is not wrapped, so a chord
 * appended while looping still waits until the playhead reaches it.
 */
export function lookupLoopStep(queue, cursor) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  const length = queue.length;
  const base = Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
  const index = base % length;
  return {
    index,
    chord: queue[index],
    nextCursor: base + 1,
  };
}

/**
 * Timeout chain for the Lookup loop. Attacks are `gapMs` apart.
 * `initialDelayMs` 0 plays on the next turn; a positive delay waits first
 * so a tap can attack chord 0 inside the user gesture. `stop()` clears the timer.
 */
export function runLookupLoop({
  getQueue,
  onChord,
  play,
  gapMs = LOOKUP_LOOP_GAP_MS,
  startCursor = 0,
  initialDelayMs = 0,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}) {
  let cursor = startCursor;
  let timer = null;
  let stopped = false;

  const tick = () => {
    timer = null;
    if (stopped) return;
    const step = lookupLoopStep(getQueue(), cursor);
    if (!step) {
      stopped = true;
      onChord(null);
      return;
    }
    cursor = step.nextCursor;
    onChord(step);
    if (stopped) return;
    play(step.chord);
    if (stopped) return;
    timer = setTimer(tick, gapMs);
  };

  timer = setTimer(tick, initialDelayMs);

  return function stopLookupLoop() {
    stopped = true;
    if (timer != null) {
      clearTimer(timer);
      timer = null;
    }
  };
}
