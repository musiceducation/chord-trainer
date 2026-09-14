export const HINT_HOLD_MS = 2000;
export const SEQ_HOLD_MS = 420;
export const SEQ_GAP_MS = 90;

export function sequentialHintStarts(count, { holdMs = SEQ_HOLD_MS, gapMs = SEQ_GAP_MS } = {}) {
  return Array.from({ length: count }, (_, index) => index * (holdMs + gapMs));
}

export function scheduleSequentialHint(pcs, setHintNotes, schedule, options = {}) {
  const { holdMs = SEQ_HOLD_MS, gapMs = SEQ_GAP_MS } = options;
  const starts = sequentialHintStarts(pcs.length, { holdMs, gapMs });
  starts.forEach((at, index) => {
    schedule(() => setHintNotes(new Set([pcs[index]])), at);
  });
  schedule(() => setHintNotes(null), (starts[starts.length - 1] ?? 0) + holdMs);
}

export function scheduleAllHint(pcs, setHintNotes, schedule, holdMs = HINT_HOLD_MS) {
  setHintNotes(new Set(pcs));
  schedule(() => setHintNotes(null), holdMs);
}
