import { describe, it, expect } from 'vitest';
import {
  PROGRESSION_CATALOG,
  buildDiatonicChord,
  formatProgressionAnswer,
  formatProgressionPattern,
  generateProgressionQuestion,
  getRootForDegree,
  isProgressionAnswerCorrect,
  resolveDegreeChord,
} from '../lib/diatonic.js';
import { getChordPitchClasses } from '../lib/chords.js';
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

  it('generates the named catalog in major and minor', () => {
    expect(PROGRESSION_CATALOG.map((item) => item.id)).toEqual([
      'I-IV-V-I',
      'ii-V-I',
      'I-V-vi-IV',
      'I-vi-IV-V',
    ]);
    expect(PROGRESSION_CATALOG.every((item) => item.access === 'pro')).toBe(true);
    expect(generateProgressionQuestion({ allowedIds: [], random: () => 0 })).toBeNull();
    expect(formatProgressionPattern('I-IV-V-I', 'major')).toBe('I–IV–V–I');
    expect(formatProgressionPattern('ii-V-I', 'minor')).toBe('ii°–V–i');
    expect(formatProgressionPattern('I-V-vi-IV', 'minor')).toBe('i–V–VI–iv');
    expect(formatProgressionPattern('I-vi-IV-V', 'major')).toBe('I–vi–IV–V');

    const major = generateProgressionQuestion({
      progressionId: 'I-IV-V-I',
      quality: 'major',
      keyRoot: 'C',
      tier: 'basic',
      random: () => 0,
    });
    expect(major.degreeNums).toEqual([1, 4, 5, 1]);
    expect(major.chords.map((c) => c.roman)).toEqual(['I', 'IV', 'V', 'I']);
    expect(major.chords.map((c) => `${c.root}${c.type}`)).toEqual(['C', 'F', 'G', 'C']);
    expect(major.tonic.roman).toBe('I');
    expect(major.voicings).toHaveLength(4);
    expect(major.label).toBe('C major: I-IV-V-I');

    const cadence = generateProgressionQuestion({
      progressionId: 'ii-V-I',
      quality: 'minor',
      keyRoot: 'A',
      tier: 'basic',
      random: () => 0,
    });
    expect(cadence.length).toBe(3);
    expect(cadence.chords.map((c) => c.roman)).toEqual(['ii°', 'V', 'i']);
    expect(cadence.chords.map((c) => c.root)).toEqual(['B', 'E', 'A']);
    expect(cadence.chords.map((c) => c.type)).toEqual(['dim', '', 'm']);

    const pop = generateProgressionQuestion({
      progressionId: 'I-V-vi-IV',
      quality: 'minor',
      keyRoot: 'C',
      tier: 'basic',
      random: () => 0,
    });
    expect(pop.chords.map((c) => `${c.root}${c.type}`)).toEqual(['Cm', 'G', 'Ab', 'Fm']);

    const turnaround = generateProgressionQuestion({
      progressionId: 'I-vi-IV-V',
      quality: 'major',
      keyRoot: 'G',
      tier: 'seventh',
      random: () => 0,
    });
    expect(turnaround.chords.map((c) => c.type)).toEqual(['maj7', 'm7', 'maj7', '7']);
  });

  it('picks a random training key when the key is not pinned', () => {
    const values = [0.01, 0.2, 0.45, 0.7, 0.84, 0.97];
    let cursor = 0;
    const random = () => {
      const value = values[cursor % values.length];
      cursor += 1;
      return value;
    };
    const keys = new Set();
    for (let n = 0; n < 6; n += 1) {
      keys.add(generateProgressionQuestion({
        progressionId: 'ii-V-I',
        quality: 'major',
        tier: 'basic',
        random,
      }).keyRoot);
    }
    expect(keys.size).toBeGreaterThan(1);
  });

  it('voice-leads each catalog chord inside the piano range', () => {
    const q = generateProgressionQuestion({
      progressionId: 'I-IV-V-I',
      quality: 'major',
      keyRoot: 'C',
      tier: 'basic',
      random: () => 0,
    });
    q.voicings.forEach((midis, index) => {
      const pcs = getChordPitchClasses(q.chords[index].root, q.chords[index].type);
      expect(midis.length).toBeGreaterThanOrEqual(3);
      midis.forEach((midi, voice) => {
        expect(pcs.has(((midi % 12) + 12) % 12)).toBe(true);
        expect(midi).toBeGreaterThanOrEqual(48);
        expect(midi).toBeLessThanOrEqual(76);
        if (voice > 0) expect(midi).toBeGreaterThan(midis[voice - 1]);
      });
    });
    const shared = q.voicings[1].filter((midi) => q.voicings[0].includes(midi));
    expect(shared.length).toBeGreaterThan(0);
    q.voicings.slice(1).forEach((midis, index) => {
      const previous = q.voicings[index];
      expect(midis.length).toBe(previous.length);
      midis.forEach((midi, voice) => {
        expect(Math.abs(midi - previous[voice])).toBeLessThanOrEqual(7);
      });
    });
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
