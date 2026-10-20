import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS } from '../lib/entitlement.js';
import { TABS } from '../lib/constants.js';
import {
  buildReadQuestion,
  generateReadQuestion,
  isReadAnswerCorrect,
  qualitiesForTier,
  questionFromReadSpec,
  signatureFor,
} from '../lib/readIdentify.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(tier, count, seed) {
  const random = mulberry32(seed);
  const questions = [];
  let lastId = null;
  for (let i = 0; i < count; i += 1) {
    const question = generateReadQuestion({ tier, lastId, random });
    questions.push(question);
    lastId = question.id;
  }
  return questions;
}

const TRIADS = new Set(['', 'm', 'aug', 'dim']);
const SEVENTHS = new Set(['7', 'maj7', 'm7', 'm7b5', 'dim7']);

describe('read & identify questions', () => {
  it('engraves F#-A-C#-E under a two-sharp signature', () => {
    const question = buildReadQuestion({
      key: 'D',
      degree: 3,
      quality: 'm7',
      inversion: 0,
      bassPosition: 3,
    });
    expect(question.signature.count).toBe(2);
    expect(question.signature.kind).toBe('sharp');
    expect(question.signature.positions).toEqual([10, 7]);
    expect(signatureFor(2).letters.F).toBe(1);
    expect(signatureFor(2).letters.C).toBe(1);
    expect(question.notes.map((note) => note.name)).toEqual(['F#', 'A', 'C#', 'E']);
    expect(question.printedAccidentals).toBe(0);
    expect(question.ledgerCount).toBe(0);
    expect(question.quality).toBe('m7');
    expect(question.root).toBe('F#');
    expect(question.voicing).toEqual([66, 69, 73, 76]);
    expect(isReadAnswerCorrect(question, 'm7')).toBe(true);
    expect(isReadAnswerCorrect(question, '7')).toBe(false);
  });

  it('stacks inversions in close position and offsets a second', () => {
    const question = buildReadQuestion({
      key: 'C',
      rootName: 'C',
      quality: '7',
      inversion: 1,
      bassPosition: 2,
    });
    expect(question.notes.map((note) => note.name)).toEqual(['E', 'G', 'Bb', 'C']);
    expect(question.notes.map((note) => note.position)).toEqual([2, 4, 6, 7]);
    expect(question.notes.map((note) => note.column)).toEqual([0, 0, 0, 1]);
    expect(question.notes[0].pc).toBe(4);
    expect(question.voicing[0] % 12).toBe(question.notes[0].pc);
    expect(question.inversion).toBe(1);
  });

  it('keeps easy on root-position triads without ledger lines', () => {
    const questions = sample('easy', 60, 11);
    expect(qualitiesForTier('easy').map((q) => q.id)).toEqual(['', 'm', 'aug', 'dim']);
    for (const question of questions) {
      expect(TRIADS.has(question.quality)).toBe(true);
      expect(SEVENTHS.has(question.quality)).toBe(false);
      expect(question.inversion).toBe(0);
      expect(question.ledgerCount).toBe(0);
      expect(question.printedAccidentals).toBeLessThanOrEqual(1);
      expect(question.signature.count).toBeLessThanOrEqual(2);
      expect(question.notes.map((note) => note.position)).toEqual(
        [...question.notes.map((note) => note.position)].sort((a, b) => a - b),
      );
    }
    expect(new Set(questions.map((q) => q.quality)).size).toBe(4);
  });

  it('adds all five seventh qualities on medium, still in root position', () => {
    const questions = sample('medium', 120, 29);
    const qualities = new Set(questions.map((q) => q.quality));
    expect(qualitiesForTier('medium')).toHaveLength(9);
    for (const id of SEVENTHS) expect(qualities.has(id)).toBe(true);
    expect([...qualities].some((id) => TRIADS.has(id))).toBe(true);
    for (const question of questions) {
      expect(question.inversion).toBe(0);
      expect(question.ledgerCount).toBeLessThanOrEqual(1);
      expect(question.printedAccidentals).toBeLessThanOrEqual(2);
    }
  });

  it('makes hard a mix of inversions, extra accidentals, and ledger lines', () => {
    const easy = sample('easy', 80, 3);
    const medium = sample('medium', 80, 5);
    const hard = sample('hard', 80, 7);
    const mean = (list, field) => list.reduce((sum, q) => sum + q[field], 0) / list.length;
    expect(hard.some((q) => q.inversion > 0)).toBe(true);
    expect(hard.some((q) => q.inversion === 0)).toBe(true);
    expect(hard.some((q) => TRIADS.has(q.quality))).toBe(true);
    expect(hard.some((q) => SEVENTHS.has(q.quality))).toBe(true);
    expect(mean(hard, 'ledgerCount')).toBeGreaterThan(mean(medium, 'ledgerCount'));
    expect(mean(hard, 'ledgerCount')).toBeGreaterThan(mean(easy, 'ledgerCount'));
    expect(mean(hard, 'printedAccidentals')).toBeGreaterThan(mean(easy, 'printedAccidentals'));
    expect(hard.some((q) => q.ledgerCount >= 2)).toBe(true);
    for (const question of hard) {
      expect(question.notes.every((note) => Math.abs(note.accidental) <= 1)).toBe(true);
      const pcs = new Set(question.notes.map((note) => note.pc));
      expect(pcs.size).toBe(question.notes.length);
    }
  });

  it('rebuilds a missed chord for the mistake book', () => {
    const again = questionFromReadSpec({
      root: 'F#',
      type: 'm7',
      inversion: 0,
      keyId: 'D',
      mode: 'read',
    });
    expect(again.root).toBe('F#');
    expect(again.quality).toBe('m7');
    expect(again.keyId).toBe('D');
    expect(again.notes.map((note) => note.name)).toEqual(['F#', 'A', 'C#', 'E']);
    expect(again.printedAccidentals).toBe(0);
  });
});

describe('read & identify wiring', () => {
  it('is a free practice tab and does not add a product id', () => {
    expect(TABS.map((tab) => tab.key)).toContain('read');
    expect(Object.values(PRODUCT_IDS)).toEqual([
      'com.musiceducation.chordtrainer.pro.monthly',
      'com.musiceducation.chordtrainer.pro',
      'com.musiceducation.chordtrainer.support.small',
      'com.musiceducation.chordtrainer.support.large',
    ]);
    const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(app).toMatch(/ReadIdentifyMode/);
    expect(app).not.toMatch(/chordtrainer\.read/);
    const mode = readFileSync(new URL('../components/ReadIdentifyMode.jsx', import.meta.url), 'utf8');
    expect(mode).toMatch(/playChord\(question\.voicing\)/);
    expect(mode).toMatch(/read\.reveal/);
    expect(mode).toMatch(/mode: 'read'/);
    expect(mode).toMatch(/onRoundSettled/);
  });
});
