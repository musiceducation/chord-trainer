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
