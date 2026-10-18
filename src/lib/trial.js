/** App-managed Pro trial. StoreKit introductory offers need a subscription SKU. */

export const TRIAL_START_KEY = 'chordTrainerTrialStart';
export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

function storageOrNull(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
}

export function readTrialStart(storage) {
  const store = storageOrNull(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(TRIAL_START_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  } catch {
    return null;
  }
}

/** Start the clock on first launch. Idempotent. */
export function ensureTrialStarted(storage, now = Date.now()) {
  const store = storageOrNull(storage);
  if (!store) return null;
  const existing = readTrialStart(store);
  if (existing) return existing;
  try {
    store.setItem(TRIAL_START_KEY, String(now));
    return now;
  } catch {
    return null;
  }
}

/**
 * @returns {{
 *   started: boolean,
 *   active: boolean,
 *   startedAt: number | null,
 *   endsAt: number | null,
 *   msRemaining: number,
 *   daysRemaining: number,
 * }}
 */
export function getTrialStatus(storage, now = Date.now()) {
  const startedAt = readTrialStart(storage);
  if (!startedAt) {
    return {
      started: false,
      active: false,
      startedAt: null,
      endsAt: null,
      msRemaining: 0,
      daysRemaining: 0,
    };
  }
  const endsAt = startedAt + TRIAL_MS;
  const msRemaining = Math.max(0, endsAt - now);
  const active = msRemaining > 0;
  return {
    started: true,
    active,
    startedAt,
    endsAt,
    msRemaining,
    daysRemaining: active ? Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000))) : 0,
  };
}

/** Purchased Pro or an active free trial unlocks Pro-gated features. */
export function hasProAccess(isPro, trialStatus) {
  return Boolean(isPro) || Boolean(trialStatus?.active);
}
