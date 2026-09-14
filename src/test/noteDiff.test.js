import { describe, it, expect } from 'vitest';
import {
  describeWrongNote,
  diffPitchClasses,
  formatNoteDiff,
  formatPitchClasses,
  noteDiffMessageKey,
} from '../lib/noteDiff.js';
import { getChordPitchClasses } from '../lib/chords.js';
import { t } from '../lib/i18n.js';

describe('noteDiff', () => {
  const cMajor = getChordPitchClasses('C', '');

  it('diffs extra, missing, and correct pitch classes', () => {
    expect(diffPitchClasses([0, 5], cMajor)).toEqual({
      extra: [5],
      missing: [4, 7],
      correct: [0],
    });
  });

  it('formats note names from pitch classes', () => {
    expect(formatPitchClasses([0, 4, 7])).toBe('C, E, G');
  });

  it('picks extra / missing / partial message keys', () => {
    expect(noteDiffMessageKey({ extra: [5], missing: [0, 4, 7], correct: [] }))
      .toBe('live.wrongExtraMissing');
    expect(noteDiffMessageKey({ extra: [5], missing: [7], correct: [0, 4] }))
      .toBe('live.wrongPartial');
    expect(noteDiffMessageKey({ extra: [], missing: [7], correct: [0, 4] }))
      .toBe('live.wrongMissing');
    expect(noteDiffMessageKey({ extra: [5], missing: [], correct: [0, 4, 7] }))
      .toBe('live.wrongExtra');
  });

  it('names the wrong note against the target chord', () => {
    const message = describeWrongNote(65, new Set([0, 4]), cMajor, (key, vars) => t('en', key, vars));
    expect(message).toContain('F');
    expect(message).toContain('G');
    expect(message).toContain('C, E');
  });

  it('localizes wrong-note copy', () => {
    const diff = { extra: [5], missing: [7], correct: [0, 4] };
    expect(formatNoteDiff(diff, (key, vars) => t('en', key, vars))).toBe('C, E ✓ Extra: F. Still need: G');
    expect(formatNoteDiff(diff, (key, vars) => t('zh-Hant', key, vars))).toContain('多咗：F');
  });
});
