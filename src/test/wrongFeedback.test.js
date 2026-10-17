import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { t } from '../lib/i18n.js';

const MODES = ['EarMode', 'TestMode', 'ProgressionEarMode', 'AbrsmMode'];

describe('wrong-answer feedback', () => {
  it.each(MODES)('%s never names the wrong note or the answer', (mode) => {
    const src = readFileSync(new URL(`../components/${mode}.jsx`, import.meta.url), 'utf8');
    expect(src).not.toMatch(/feedback\.youPlayed|feedback\.youPicked|feedback\.answer|live\.wrongAnswer/);
  });

  it('has a neutral try-again line in every language', () => {
    for (const lang of ['en', 'zh-Hant', 'zh-Hans']) {
      const line = t(lang, 'live.tryAgain');
      expect(line).not.toBe('live.tryAgain');
      expect(line).not.toMatch(/\{/);
    }
  });
});
