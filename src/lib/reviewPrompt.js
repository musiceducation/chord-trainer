/**
 * Soft "Enjoying Chord Trainer?" gate before StoreKit requestReview().
 * Never prompts on cold launch — only after positive milestones.
 * Persists decisions so we do not nag; Apple also rate-limits the sheet.
 */

export const REVIEW_KEY = 'chordTrainerReview_v1';

/** Clean answers in a row before we consider a streak milestone. */
export const REVIEW_STREAK_MILESTONE = 5;

/** Minimum fraction correct to treat a finished drill as positive. */
export const REVIEW_DRILL_PASS_RATIO = 0.6;

/** Days after "Not really" before we may ask again. */
export const REVIEW_DECLINE_COOLDOWN_DAYS = 90;

/** Days between soft-gate offers (any outcome). */
export const REVIEW_SOFT_GATE_COOLDOWN_DAYS = 14;

/** Days between native requestReview() calls we initiate. */
export const REVIEW_REQUEST_COOLDOWN_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export function emptyReviewState() {
  return {
    softAnswer: null,
    lastSoftGateAt: '',
    lastRequestAt: '',
    requestCount: 0,
  };
}

export function normalizeReviewState(raw) {
  if (!raw || typeof raw !== 'object') return emptyReviewState();
  const softAnswer = raw.softAnswer === 'yes' || raw.softAnswer === 'no' ? raw.softAnswer : null;
  return {
    softAnswer,
    lastSoftGateAt: typeof raw.lastSoftGateAt === 'string' ? raw.lastSoftGateAt : '',
    lastRequestAt: typeof raw.lastRequestAt === 'string' ? raw.lastRequestAt : '',
    requestCount: Math.max(0, Number(raw.requestCount) || 0),
  };
}

export function loadReviewState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return emptyReviewState();
  try {
    const raw = storage.getItem(REVIEW_KEY);
    if (raw) return normalizeReviewState(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return emptyReviewState();
}

export function saveReviewState(state, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    storage.setItem(REVIEW_KEY, JSON.stringify(normalizeReviewState(state)));
    return true;
  } catch {
    return false;
  }
}

function daysSince(iso, nowMs) {
  if (!iso) return Infinity;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return Infinity;
  return (nowMs - then) / DAY_MS;
}

/**
 * @param {{
 *   state?: ReturnType<typeof normalizeReviewState>,
 *   now?: number | Date,
 *   reason?: 'drillDone' | 'streak',
 * }} [opts]
 */
export function shouldOfferSoftGate(opts = {}) {
  const state = normalizeReviewState(opts.state);
  const nowMs = opts.now instanceof Date ? opts.now.getTime() : Number(opts.now) || Date.now();

  if (daysSince(state.lastSoftGateAt, nowMs) < REVIEW_SOFT_GATE_COOLDOWN_DAYS) return false;
  if (daysSince(state.lastRequestAt, nowMs) < REVIEW_REQUEST_COOLDOWN_DAYS) return false;

  if (state.softAnswer === 'no' && daysSince(state.lastSoftGateAt, nowMs) < REVIEW_DECLINE_COOLDOWN_DAYS) {
    return false;
  }

  // After a Yes we already requested; wait for request cooldown (handled above).
  // Soft gate may appear again after REQUEST cooldown so StoreKit can show later.
  return true;
}

export function isPositiveDrillResult(correct, total) {
  const t = Number(total) || 0;
  const c = Number(correct) || 0;
  if (t <= 0) return false;
  return c / t >= REVIEW_DRILL_PASS_RATIO;
}

export function isStreakMilestone(streak) {
  const n = Number(streak) || 0;
  return n > 0 && n % REVIEW_STREAK_MILESTONE === 0;
}

export function recordSoftGateShown(state, now = new Date()) {
  const next = normalizeReviewState(state);
  next.lastSoftGateAt = (now instanceof Date ? now : new Date(now)).toISOString();
  return next;
}

export function recordSoftAnswer(state, answer, now = new Date()) {
  const next = recordSoftGateShown(state, now);
  next.softAnswer = answer === 'yes' ? 'yes' : 'no';
  return next;
}

export function recordReviewRequested(state, now = new Date()) {
  const next = normalizeReviewState(state);
  next.lastRequestAt = (now instanceof Date ? now : new Date(now)).toISOString();
  next.requestCount += 1;
  next.softAnswer = 'yes';
  return next;
}
