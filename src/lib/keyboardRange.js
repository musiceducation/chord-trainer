import {
  ALL_KEYS,
  FULL_END,
  FULL_START,
  VISIBLE_WHITE_KEYS,
  WIDE_VISIBLE_WHITE_KEYS,
} from './constants.js';

export function whiteKeyCount(wide = false) {
  return wide ? WIDE_VISIBLE_WHITE_KEYS : VISIBLE_WHITE_KEYS;
}

/** Visible piano keys for a window that starts at `keyboardStart`. */
export function visibleKeysForStart(keyboardStart, wide = false) {
  const count = whiteKeyCount(wide);
  const whites = ALL_KEYS.filter((key) => !key.isBlack && key.midi >= keyboardStart);
  const start = whites[0]?.midi ?? keyboardStart;
  const endWhite = whites[count - 1];
  if (!endWhite) {
    return ALL_KEYS.filter((key) => key.midi >= start && key.midi <= FULL_END);
  }
  const end = Math.min(endWhite.midi + 1, FULL_END);
  return ALL_KEYS.filter((key) => key.midi >= start && key.midi <= end);
}

/**
 * Highest on-screen window that still contains every MIDI note.
 * Used so a close voicing lights keys the player can actually see.
 */
export function keyboardStartContaining(midis, wide = false) {
  const notes = [...midis].filter((midi) => Number.isFinite(midi));
  if (!notes.length) return FULL_START;
  const low = Math.min(...notes);
  const whites = ALL_KEYS.filter((key) => !key.isBlack && key.midi <= low);
  for (let i = whites.length - 1; i >= 0; i -= 1) {
    const start = whites[i].midi;
    const shown = new Set(visibleKeysForStart(start, wide).map((key) => key.midi));
    if (notes.every((midi) => shown.has(midi))) return start;
  }
  return whites[0]?.midi ?? FULL_START;
}

export function canShiftKeyboard(keyboardStart, direction, wide = false) {
  if (direction < 0) return keyboardStart - 12 >= FULL_START;
  if (!wide) return keyboardStart + 18 < FULL_END;
  const next = keyboardStart + 12;
  const keys = visibleKeysForStart(next, true);
  const whites = keys.filter((key) => !key.isBlack).length;
  return whites >= 12 && keys[keys.length - 1].midi <= FULL_END;
}
