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

export function canShiftKeyboard(keyboardStart, direction, wide = false) {
  if (direction < 0) return keyboardStart - 12 >= FULL_START;
  if (!wide) return keyboardStart + 18 < FULL_END;
  const next = keyboardStart + 12;
  const keys = visibleKeysForStart(next, true);
  const whites = keys.filter((key) => !key.isBlack).length;
  return whites >= 12 && keys[keys.length - 1].midi <= FULL_END;
}
