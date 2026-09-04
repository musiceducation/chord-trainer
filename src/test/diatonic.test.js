import { describe, it, expect } from 'vitest';
import {
  buildDiatonicChord,
  formatProgressionAnswer,
  generateProgressionQuestion,
  getRootForDegree,
  isProgressionAnswerCorrect,
  resolveDegreeChord,
} from '../lib/diatonic.js';
import { formatChord } from '../lib/chords.js';

describe('diatonic', () => {
  it('maps C major degrees to correct roots', () => {
    expect(getRootForDegree('C', { scaleStep: 0 })).toBe('C');
    expect(getRootForDegree('C', { scaleStep: 2 })).toBe('D');
    expect(getRootForDegree('C', { scaleStep: 7 })).toBe('G');
    expect(getRootForDegree('C', { scaleStep: 11 })).toBe('B');
  });

  it('uses flat spellings in flat keys', () => {
    expect(buildDiatonicChord('Bb', 1, 'basic').root).toBe('Bb');
    expect(buildDiatonicChord('Bb', 4, 'basic').root).toBe('Eb');
    expect(buildDiatonicChord('F', 4, 'basic').root).toBe('Bb');
    expect(buildDiatonicChord('Eb', 1, 'basic').root).toBe('Eb');
    expect(buildDiatonicChord('Eb', 4, 'basic').root).toBe('Ab');
    expect(buildDiatonicChord('Eb', 5, 'basic').root).toBe('Bb');
  });

  it('builds diatonic chords for C major', () => {
    const v = buildDiatonicChord('C', 5, 'basic');
    expect(v.roman).toBe('V');
    expect(v.root).toBe('G');
    expect(v.type).toBe('');
  });

  it('uses seventh qualities at seventh tier', () => {
    const ii = buildDiatonicChord('C', 2, 'seventh');
    const v = buildDiatonicChord('C', 5, 'seventh');
    expect(ii.type).toBe('m7');
    expect(v.type).toBe('7');
  });

  it('resolves degree preview from the sounding progression quality', () => {
    const q = generateProgressionQuestion({
      keyRoot: 'C',
      tier: 'seventh',
      random: () => 0.1,
    });
    const first = q.chords[0];
    const resolved = resolveDegreeChord('C', first.degreeNum, 'seventh', q.chords);
    expect(resolved.type).toBe(first.type);
    expect(resolved.root).toBe(first.root);
  });

  it('generates a 4-chord progression', () => {
    const q = generateProgressionQuestion({ keyRoot: 'C', tier: 'basic', random: () => 0.5 });
    expect(q.chords).toHaveLength(4);
    expect(q.degreeNums).toHaveLength(4);
    expect(q.tonic.roman).toBe('I');
    expect(q.label).toMatch(/^C: /);
  });

  it('formats progression answers', () => {
    expect(formatProgressionAnswer([1, 5, 6, 4])).toBe('I → V → vi → IV');
  });

  it('preserves roman case in formatChord for progression labels', () => {
    expect(formatChord('Bb: I-V-vi-IV')).toBe('Bb: I-V-vi-IV');
    expect(formatChord('Cmaj7')).toBe('Cmaj7');
  });

  it('checks progression answers', () => {
    expect(isProgressionAnswerCorrect([1, 5, 6, 4], [1, 5, 6, 4])).toBe(true);
    expect(isProgressionAnswerCorrect([1, 4, 5, 1], [1, 5, 6, 4])).toBe(false);
    expect(isProgressionAnswerCorrect([null, 5, null, 4], [1, 5, 6, 4])).toBe(false);
  });
});
