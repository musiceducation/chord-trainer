/**
 * Shared "piano is sounding" clock for the banner gate.
 * Holds stay up for the scheduled sustain, or until a caller releases them.
 */

const holds = new Map();
const listeners = new Set();
let timer = null;

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function emit(playing) {
  for (const listener of listeners) listener(playing);
}

function armTimer() {
  if (timer != null) {
    clearTimeout(timer);
    timer = null;
  }
  const now = nowMs();
  let next = Infinity;
  for (const [id, until] of holds) {
    if (until <= now) holds.delete(id);
    else if (until < next) next = until;
  }
  const playing = holds.size > 0;
  emit(playing);
  if (!playing || !Number.isFinite(next)) return;
  const delay = Math.max(0, next - now);
  timer = setTimeout(() => {
    timer = null;
    armTimer();
  }, delay);
  if (timer && typeof timer.unref === 'function') timer.unref();
}

export function isAudioPlaying() {
  const now = nowMs();
  for (const until of holds.values()) {
    if (until > now) return true;
  }
  return false;
}

/** Extend the sounding window. Overlapping notes keep the latest end. */
export function markAudible(durationMs) {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms <= 0) return;
  const until = nowMs() + ms;
  const current = holds.get('piano') || 0;
  if (until > current) holds.set('piano', until);
  armTimer();
}

/** A long-lived hold, such as Lookup's play loop, including gaps between chords. */
export function setAudioHold(id, held) {
  if (!id) return;
  if (held) holds.set(id, Infinity);
  else holds.delete(id);
  armTimer();
}

export function subscribeAudioPlaying(listener) {
  listeners.add(listener);
  listener(isAudioPlaying());
  return () => {
    listeners.delete(listener);
  };
}

export function resetAudioActivityForTests() {
  if (timer != null) {
    clearTimeout(timer);
    timer = null;
  }
  holds.clear();
  emit(false);
}
