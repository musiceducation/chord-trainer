import { buildChordVoicing, targetPcsInChordOrder, voiceWithBass } from './chords.js';
import {
  CHORD_FORMULAS,
  DIFFICULTY_LEVELS,
  FULL_END,
  FULL_START,
  NOTE_TO_PC,
} from './constants.js';
import { keyboardStartContaining } from './keyboardRange.js';

/**
 * Lookup-only qualities, in chip order. Not part of Identify or Listen.
 * Listed explicitly because `6` is an integer key and `Object.keys` would
 * float it (and `7` / `9`) ahead of the other formulas.
 * The jazz whitelist lives in `CHORD_FORMULAS` too, but it is typed-only:
 * those keys are intentionally absent here so the chip row stays put.
 */
export const LOOKUP_EXTRA_TYPES = [
  '6', 'm6', 'add9', 'madd9', 'b5', '#5', '7b5', '7#5', '7sus4', 'm9',
];

const FORMULA_KEYS = new Set(Object.keys(CHORD_FORMULAS));
export const LOOKUP_QUALITY_TYPES = [
  ...DIFFICULTY_LEVELS.all.types.filter((type) => FORMULA_KEYS.has(type)),
  ...LOOKUP_EXTRA_TYPES.filter((type) => FORMULA_KEYS.has(type)),
];

/**
 * Exact spellings that share an existing formula. Not a stack language:
 * `maj7add2` is listed, `maj7add2#11` is not.
 * `add2` is add9. Seventh-plus-add2/add9 is that seventh's 9th chord.
 * `6/9` is handled in the parser (the slash is not a bass).
 */
export const LOOKUP_QUALITY_ALIASES = {
  add2: 'add9',
  madd2: 'madd9',
  maj7add2: 'maj9',
  maj7add9: 'maj9',
  m7add2: 'm9',
  m7add9: 'm9',
  '7add2': '9',
  '7add9': '9',
  alt: '7alt',
  mM7: 'm(maj7)',
  mmaj7: 'm(maj7)',
  minMaj7: 'm(maj7)',
  M7: 'maj7',
  min: 'm',
  'ø': 'm7b5',
  'ø7': 'm7b5',
  '°': 'dim',
  '°7': 'dim7',
};

/** Groups in the parse error. A slash inside a group is an alias, except `6/9`. */
const SUPPORTED_QUALITY_GROUPS = [
  ['major'],
  ['m', 'min'],
  ['dim', '°'],
  ['aug'],
  ['sus2'],
  ['sus4'],
  ['maj7', 'M7'],
  ['m7'],
  ['7'],
  ['m7b5', 'ø', 'ø7'],
  ['dim7', '°7'],
  ['7b9'],
  ['9', '7add9', '7add2'],
  ['maj9', 'maj7add9', 'maj7add2'],
  ['6'],
  ['m6'],
  ['add9', 'add2'],
  ['madd9', 'madd2'],
  ['b5'],
  ['#5'],
  ['7b5'],
  ['7#5'],
  ['7sus4'],
  ['m9', 'm7add9', 'm7add2'],
  ['add4'],
  ['11'],
  ['13'],
  ['maj11'],
  ['maj13'],
  ['m11'],
  ['m13'],
  ['7#9'],
  ['7b13'],
  ['7#11'],
  ['maj7#11'],
  ['7alt', 'alt'],
  ['m(maj7)', 'mM7', 'mmaj7', 'minMaj7'],
  ['69', '6/9'],
];

const NOTE_HEAD = /^([A-Ga-g])([#b])?(.*)$/;
const BASS_NOTE = /^([A-Ga-g])([#b])?$/;

export function formatLookupName(root, type, bass) {
  const chord = `${root}${type}`;
  return bass ? `${chord}/${bass}` : chord;
}

function canonicalQuality(suffix) {
  if (Object.prototype.hasOwnProperty.call(CHORD_FORMULAS, suffix)) return suffix;
  if (Object.prototype.hasOwnProperty.call(LOOKUP_QUALITY_ALIASES, suffix)) {
    return LOOKUP_QUALITY_ALIASES[suffix];
  }
  return null;
}

function parseHead(head) {
  const match = head.match(NOTE_HEAD);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] || '';
  const rest = match[3];
  const rooted = letter + accidental;
  if (accidental && Object.prototype.hasOwnProperty.call(NOTE_TO_PC, rooted)) {
    const type = canonicalQuality(rest);
    if (type != null) return { root: rooted, type };
  }
  if (Object.prototype.hasOwnProperty.call(NOTE_TO_PC, letter)) {
    const type = canonicalQuality(accidental + rest);
    if (type != null) return { root: letter, type };
  }
  return null;
}

/**
 * Curated symbol: root + a whitelist quality, then an optional `/Bass`.
 * Major is the empty suffix (`C`). An accidental stays on the root when the
 * rest is a real quality (`Bb7`, `Bb9`, `F#m7`, `F#11`). It starts a `b5` /
 * `#5` quality only when that root reading is not a formula (`Cb5` → C
 * flat-five, `C#5` → C sharp-five). Aliases rewrite to the formula key
 * (`F#maj7add2` → F#maj9). `C6/9` is the 6/9 quality, not a bass of `9`;
 * `C6/E` stays a slash chord. Bass must be one `NOTE_TO_PC` note.
 * No polychords, no altered mega-stacks (`maj7#11b13`, `maj7add2#11`).
 */
export function parseChordSymbol(raw) {
  const text = String(raw ?? '')
    .trim()
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/Ø/g, 'ø');
  if (!text || /\s/.test(text)) return { ok: false };
  const slashAt = text.indexOf('/');
  if (slashAt !== -1 && text.includes('/', slashAt + 1)) return { ok: false };
  const head = slashAt === -1 ? text : text.slice(0, slashAt);
  const bassText = slashAt === -1 ? null : text.slice(slashAt + 1);
  if (!head) return { ok: false };

  const parsed = parseHead(head);
  if (!parsed) return { ok: false };

  if (bassText === '9' && parsed.type === '6') {
    return {
      ok: true,
      root: parsed.root,
      type: '69',
      bass: null,
      name: formatLookupName(parsed.root, '69', null),
    };
  }

  let bass = null;
  if (bassText != null) {
    const bassMatch = bassText.match(BASS_NOTE);
    if (!bassMatch) return { ok: false };
    bass = bassMatch[1].toUpperCase() + (bassMatch[2] || '');
    if (!Object.prototype.hasOwnProperty.call(NOTE_TO_PC, bass)) return { ok: false };
  }

  return {
    ok: true,
    root: parsed.root,
    type: parsed.type,
    bass,
    name: formatLookupName(parsed.root, parsed.type, bass),
  };
}

/** Grouped whitelist for the inline parse error. Major is spelled out. */
export function supportedChordFormatList() {
  const qualities = SUPPORTED_QUALITY_GROUPS.map((group) => group.join('/')).join(', ');
  return `${qualities}, /bass`;
}

/**
 * One concrete voicing on the on-screen keyboard.
 * Root position keeps the practice stack (`buildChordVoicing`), including
 * compound 9ths. A slash bass uses `voiceWithBass`, so the lowest MIDI is
 * that bass and the other tones sit close above it.
 * Prefers the MIDI 60 register and drops an octave only when a tone would
 * fall off the keyboard.
 */
export function lookupVoicing(root, type, bass = null) {
  const tonePcs = bass ? targetPcsInChordOrder(root, type) : null;
  const bassPc = bass ? NOTE_TO_PC[bass] : null;
  for (const baseMidi of [60, 48, 36]) {
    const midis = bass
      ? voiceWithBass(tonePcs, bassPc, baseMidi)
      : buildChordVoicing(root, type, baseMidi);
    if (midis.length && midis.every((midi) => midi >= FULL_START && midi <= FULL_END)) {
      return midis;
    }
  }
  const fallback = bass
    ? voiceWithBass(tonePcs, bassPc, 48)
    : buildChordVoicing(root, type, 48);
  return fallback.filter((midi) => midi >= FULL_START && midi <= FULL_END);
}

function resolved(root, type, bass = null) {
  const voicing = lookupVoicing(root, type, bass);
  return {
    ok: true,
    root,
    type,
    bass: bass || null,
    name: formatLookupName(root, type, bass),
    voicing,
    keyboardStart: keyboardStartContaining(voicing),
  };
}

export function lookupFromSymbol(raw) {
  const parsed = parseChordSymbol(raw);
  if (!parsed.ok) return { ok: false, formats: supportedChordFormatList() };
  return resolved(parsed.root, parsed.type, parsed.bass);
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
  const bass = resolved.bass || null;
  if (bass) {
    if (!Object.prototype.hasOwnProperty.call(NOTE_TO_PC, bass)) return null;
    if (((voicing[0] % 12) + 12) % 12 !== NOTE_TO_PC[bass]) return null;
  }
  return {
    root: resolved.root,
    type: resolved.type,
    bass,
    name: bass
      ? formatLookupName(resolved.root, resolved.type, bass)
      : (typeof resolved.name === 'string' && resolved.name
        ? resolved.name
        : resolved.root + resolved.type),
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
