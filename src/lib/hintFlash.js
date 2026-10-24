export const HINT_HOLD_MS = 2000;

export function scheduleAllHint(pcs, setHintNotes, schedule, holdMs = HINT_HOLD_MS) {
  setHintNotes(new Set(pcs));
  schedule(() => setHintNotes(null), holdMs);
}
