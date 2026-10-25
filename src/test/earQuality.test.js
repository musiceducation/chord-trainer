import { describe, it, expect } from 'vitest';
import { NOTE_TO_PC } from '../lib/constants.js';
import {
  DEFAULT_EAR_QUALITY_POOL,
  EAR_QUALITY_LABEL_KEYS,
  EAR_QUALITY_TYPES,
  earQualityCatalogMatchesFormulas,
  earQualityPoolIsComplete,
  generateEarQualityQuestion,
  isRootPositionQuality,
  normalizeEarQualityPool,
  selectAllEarQualities,
  toggleEarQuality,
} from '../lib/earQuality.js';
import { normalizeSettings } from '../lib/settings.js';

describe('ear quality pool', () => {
  it('uses chord formulas and does not drill lookup-only qualities', () => {
    expect(earQualityCatalogMatchesFormulas()).toBe(true);
    expect(EAR_QUALITY_TYPES).not.toContain('easy');
    expect(EAR_QUALITY_TYPES).not.toContain('basic');
    for (const type of ['6', 'm6', 'add9', 'madd9', 'b5', '#5', '7b5', '7#5', '7sus4', 'm9', '11', '13', 'maj11', 'maj13', 'm11', 'm13', '7#9', '7b13', '7#11', 'maj7#11', '7alt', 'm(maj7)', '69', 'add4']) {
      expect(EAR_QUALITY_TYPES, type).not.toContain(type);
    }
    for (const type of EAR_QUALITY_TYPES) {
      expect(EAR_QUALITY_LABEL_KEYS[type]).toBeTruthy();
    }
    expect(DEFAULT_EAR_QUALITY_POOL).toEqual(['', 'm', 'aug', 'dim']);
  });

  it('normalizes a custom pool and refuses an empty selection', () => {
    expect(normalizeEarQualityPool(undefined)).toEqual([...DEFAULT_EAR_QUALITY_POOL]);
    expect(normalizeEarQualityPool([])).toEqual([...DEFAULT_EAR_QUALITY_POOL]);
    expect(normalizeEarQualityPool(['nope', 3, 'maj7'])).toEqual(['maj7']);
    expect(normalizeEarQualityPool(['7', '', '7', 'bogus', 'maj7'])).toEqual(['', '7', 'maj7']);
    expect(normalizeSettings({ earQualityPool: ['dim7', 'm'] }).earQualityPool).toEqual(['m', 'dim7']);
    expect(normalizeSettings({}).earQualityPool).toEqual([...DEFAULT_EAR_QUALITY_POOL]);
  });

  it('toggles qualities without dropping the last one', () => {
    expect(toggleEarQuality(['', 'm'], '7')).toEqual(['', 'm', '7']);
    expect(toggleEarQuality(['', 'm', '7'], '')).toEqual(['m', '7']);
    expect(toggleEarQuality(['maj7'], 'maj7')).toEqual(['maj7']);
    expect(toggleEarQuality(['m'], 'not-a-quality')).toEqual(['m']);
    expect(toggleEarQuality(['aug', ''], 'aug')).toEqual(['']);
  });

  it('selects every catalog quality and still refuses to clear the last one', () => {
    const all = selectAllEarQualities();
    expect(all).toEqual([...EAR_QUALITY_TYPES]);
    expect(earQualityPoolIsComplete(all)).toBe(true);
    expect(earQualityPoolIsComplete(['', 'm'])).toBe(false);
    expect(normalizeSettings({ earQualityPool: all }).earQualityPool).toEqual([...EAR_QUALITY_TYPES]);

    const copy = selectAllEarQualities();
    copy.pop();
    expect(selectAllEarQualities()).toHaveLength(EAR_QUALITY_TYPES.length);

    let pool = selectAllEarQualities();
    for (const type of EAR_QUALITY_TYPES) {
      pool = toggleEarQuality(pool, type);
    }
    expect(pool).toHaveLength(1);
    expect(EAR_QUALITY_TYPES).toContain(pool[0]);
    expect(toggleEarQuality(pool, pool[0])).toEqual(pool);
    expect(selectAllEarQualities()).toEqual([...EAR_QUALITY_TYPES]);
    expect(toggleEarQuality(selectAllEarQualities(), 'maj9')).toEqual(
      EAR_QUALITY_TYPES.filter((type) => type !== 'maj9'),
    );
  });

  it('draws only the selected qualities and always uses root position', () => {
    const pool = ['m', 'maj7'];
    for (let i = 0; i < 24; i += 1) {
      const question = generateEarQualityQuestion(pool, null, () => ((i * 5) % 97) / 97);
      expect(pool).toContain(question.type);
      expect(question.inversion).toBe(0);
      expect(isRootPositionQuality(question)).toBe(true);
      expect(question.bassPc).toBe(NOTE_TO_PC[question.root]);
      expect(question.voicing[0] % 12).toBe(NOTE_TO_PC[question.root]);
      expect(question.voicing.length).toBe(question.tonePcs.length);
    }
    let draw = 0;
    const again = generateEarQualityQuestion([''], 'C', () => {
      draw += 1;
      return draw === 1 ? 0 : 0.5;
    });
    expect(again.name).not.toBe('C');
    expect(again.type).toBe('');
    expect(again.inversion).toBe(0);
  });
});
