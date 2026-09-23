export const DIFFICULTY_ORDER = ['basic', 'seventh', 'extended', 'all'];

export const RAMP_CLEAN_STREAK = 4;
export const RAMP_MISS_STREAK = 2;

/**
 * Move one step along the existing difficulty list.
 * Clean streaks raise the level; a short miss streak lowers it.
 */
export function nextDifficulty({
  current,
  cleanStreak = 0,
  missStreak = 0,
} = {}) {
  const index = DIFFICULTY_ORDER.indexOf(current);
  if (index < 0) return current;
  if (missStreak >= RAMP_MISS_STREAK && index > 0) {
    return DIFFICULTY_ORDER[index - 1];
  }
  if (cleanStreak >= RAMP_CLEAN_STREAK && missStreak === 0 && index < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[index + 1];
  }
  return current;
}
