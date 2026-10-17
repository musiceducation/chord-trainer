import { describe, expect, it } from 'vitest';
import {
  REVIEW_DECLINE_COOLDOWN_DAYS,
  REVIEW_REQUEST_COOLDOWN_DAYS,
  REVIEW_SOFT_GATE_COOLDOWN_DAYS,
  REVIEW_STREAK_MILESTONE,
  emptyReviewState,
  isPositiveDrillResult,
  isStreakMilestone,
  normalizeReviewState,
  recordReviewRequested,
  recordSoftAnswer,
  shouldOfferSoftGate,
} from '../lib/reviewPrompt.js';

describe('reviewPrompt', () => {
  it('treats a mostly-correct drill as positive', () => {
    expect(isPositiveDrillResult(3, 5)).toBe(true);
    expect(isPositiveDrillResult(2, 5)).toBe(false);
  });

  it('fires on every streak milestone', () => {
    expect(isStreakMilestone(REVIEW_STREAK_MILESTONE)).toBe(true);
    expect(isStreakMilestone(REVIEW_STREAK_MILESTONE * 2)).toBe(true);
    expect(isStreakMilestone(REVIEW_STREAK_MILESTONE - 1)).toBe(false);
    expect(isStreakMilestone(0)).toBe(false);
  });

  it('never offers on a fresh state only when cooldowns block — fresh is allowed', () => {
    expect(shouldOfferSoftGate({ state: emptyReviewState() })).toBe(true);
  });

  it('respects soft-gate and request cooldowns', () => {
    const now = Date.parse('2026-10-18T00:00:00Z');
    const recentSoft = normalizeReviewState({
      lastSoftGateAt: new Date(now - (REVIEW_SOFT_GATE_COOLDOWN_DAYS - 1) * 86400000).toISOString(),
    });
    expect(shouldOfferSoftGate({ state: recentSoft, now })).toBe(false);

    const recentRequest = normalizeReviewState({
      lastRequestAt: new Date(now - (REVIEW_REQUEST_COOLDOWN_DAYS - 1) * 86400000).toISOString(),
      softAnswer: 'yes',
    });
    expect(shouldOfferSoftGate({ state: recentRequest, now })).toBe(false);
  });

  it('waits longer after a soft no', () => {
    const now = Date.parse('2026-10-18T00:00:00Z');
    const declined = recordSoftAnswer(emptyReviewState(), 'no', new Date(now));
    expect(shouldOfferSoftGate({
      state: declined,
      now: now + (REVIEW_DECLINE_COOLDOWN_DAYS - 1) * 86400000,
    })).toBe(false);
    expect(shouldOfferSoftGate({
      state: declined,
      now: now + (REVIEW_DECLINE_COOLDOWN_DAYS + REVIEW_SOFT_GATE_COOLDOWN_DAYS + 1) * 86400000,
    })).toBe(true);
  });

  it('records a yes + native request', () => {
    const next = recordReviewRequested(recordSoftAnswer(emptyReviewState(), 'yes'));
    expect(next.softAnswer).toBe('yes');
    expect(next.requestCount).toBe(1);
    expect(next.lastRequestAt).toBeTruthy();
  });
});
