import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PracticeSetupRow } from '../components/PracticeSetupRow.jsx';
import { EarQualityMode } from '../components/EarQualityMode.jsx';
import { difficultyAllowed } from '../lib/entitlement.js';
import { DIFFICULTY_LEVELS } from '../lib/constants.js';
import { STRINGS } from '../lib/i18n.js';

describe('practice setup row', () => {
  it('puts triad/7th/extended/mix on the inversion row and leaves every tier free', () => {
    const html = renderToStaticMarkup(createElement(PracticeSetupRow, {
      difficulty: 'seventh',
      onDifficultyChange: () => {},
      inversions: true,
      onInversionsChange: () => {},
    }));
    expect(html).toContain('data-testid="practice-setup-row"');
    expect(html).toContain('Triads');
    expect(html).toContain('Sevenths');
    expect(html).toContain('Extended');
    expect(html).toContain('Mix');
    expect(html).toContain('Inversions');
    expect(html).toContain('data-testid="difficulty-seventh"');
    expect(html).not.toContain('Easy');
    expect(html).not.toContain('Medium');
    expect(html).not.toContain('Hard');
    expect(html).not.toContain('簡單');
    expect(html).not.toContain('>Lock<');
    for (const key of Object.keys(DIFFICULTY_LEVELS)) {
      expect(difficultyAllowed(false, key)).toBe(true);
      expect(html).toContain(STRINGS.en[`difficulty.${key}`]);
    }
  });

  it('can show difficulty alone when a mode has no inversion toggle', () => {
    const html = renderToStaticMarkup(createElement(PracticeSetupRow, {
      difficulty: 'basic',
      onDifficultyChange: () => {},
    }));
    expect(html).toContain('Triads');
    expect(html).not.toContain('data-testid="inversion-toggle"');
  });
});

describe('ear quality listening mode', () => {
  it('offers a custom quality pool and root-position answers, not Roman tiers', () => {
    const html = renderToStaticMarkup(createElement(EarQualityMode, {
      pool: ['', 'm', '7'],
      onPoolChange: () => {},
      soundOn: false,
      pianoSound: 'acoustic',
      setStats: () => {},
      onScoreChange: () => {},
      hidden: false,
    }));
    expect(html).toContain('Ear quality');
    expect(html).toContain('Root position');
    expect(html).toContain('data-testid="ear-quality-pool"');
    expect(html).toContain('data-testid="quality-pool-major"');
    expect(html).toContain('data-testid="quality-pool-7"');
    expect(html).toContain('data-testid="quality-pool-dim7"');
    expect(html).toContain('data-testid="quality-answer-major"');
    expect(html).toContain('data-testid="quality-answer-m"');
    expect(html).toContain('data-testid="quality-answer-7"');
    expect(html).not.toContain('data-testid="quality-answer-aug"');
    expect(html).not.toContain('data-testid="quality-answer-dim7"');
    expect(html).toContain('>Major<');
    expect(html).toContain('>Dom7<');
    expect(html).not.toContain('Easy');
    expect(html).not.toContain('Triads');
    expect(html).not.toContain('Sevenths');
    expect(STRINGS['zh-Hant']['listen.title']).toBe('聽力辨型');
    expect(STRINGS['zh-Hant']['tab.listen']).toBe('聽力');
    expect(STRINGS.en['abrsm.tier.easy']).toBe('Easy');
    expect(STRINGS['zh-Hant']['abrsm.tier.easy']).toBe('簡單');
    expect(STRINGS['zh-Hant']['abrsm.tier.medium']).toBe('中級');
    expect(STRINGS['zh-Hant']['abrsm.tier.hard']).toBe('困難');
  });
});
