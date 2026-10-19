import { describe, expect, it } from 'vitest';
import {
  advanceDrill,
  applyRoundToBook,
  buildMissRetryQuestions,
  drillCorrectCount,
  emptyMissBook,
  loadMissBook,
  normalizeMissBook,
  recordMiss,
  removeMiss,
  saveMissBook,
} from '../lib/drill.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }
}

describe('miss book', () => {
  it('records and ranks misses', () => {
    let book = emptyMissBook();
    book = recordMiss(book, { root: 'C', type: '', mode: 'ear', at: '2026-01-01' });
    book = recordMiss(book, { root: 'G', type: 'm', mode: 'test', at: '2026-01-02' });
    book = recordMiss(book, { root: 'C', type: '', mode: 'ear', at: '2026-01-03' });
    expect(book.items.find((i) => i.root === 'C').misses).toBe(2);
    expect(normalizeMissBook(book).items).toHaveLength(2);
  });

  it('applies rounds and can clear a chord', () => {
    let book = recordMiss(emptyMissBook(), { root: 'D', type: '7', mode: 'ear', at: 'a' });
    book = applyRoundToBook(book, { root: 'D', type: '7' }, { missed: true, at: 'b' });
    expect(book.items[0].misses).toBe(2);
    book = applyRoundToBook(book, { root: 'D', type: '7' }, { missed: false });
    expect(book.items).toHaveLength(0);
    book = recordMiss(emptyMissBook(), { root: 'E', type: '', mode: 'ear', at: 'c' });
    expect(removeMiss(book, { root: 'E', type: '' }).items).toHaveLength(0);
  });

  it('records a progression miss and retries that key and mode', () => {
    let book = emptyMissBook();
    const question = {
      kind: 'progression',
      mode: 'progression',
      progressionId: 'ii-V-I',
      quality: 'minor',
      keyRoot: 'D',
    };
    book = applyRoundToBook(book, question, { missed: true, at: '2026-02-01' });
    expect(book.items).toHaveLength(1);
    expect(book.items[0].id).toBe('prog:ii-V-I:minor:D');
    book = applyRoundToBook(book, question, { missed: true, at: '2026-02-02' });
    expect(book.items[0].misses).toBe(2);
    const retry = buildMissRetryQuestions(book.items);
    expect(retry).toEqual([{
      kind: 'progression',
      mode: 'progression',
      progressionId: 'ii-V-I',
      quality: 'minor',
      keyRoot: 'D',
      source: 'miss',
    }]);
    book = applyRoundToBook(book, question, { missed: false });
    expect(book.items).toHaveLength(0);
    book = recordMiss(emptyMissBook(), { ...question, at: '2026-03-01' });
    book = applyRoundToBook(book, question, { skipped: true, missed: false });
    expect(book.items).toHaveLength(1);
  });

  it('persists through storage', () => {
    const storage = new MemoryStorage();
    const book = recordMiss(emptyMissBook(), { root: 'A', type: '', mode: 'test', at: 'x' });
    expect(saveMissBook(book, storage)).toBe(true);
    expect(loadMissBook(storage).items).toHaveLength(1);
  });
});

describe('miss retry drills', () => {
  it('retries only chords in the miss book', () => {
    const questions = buildMissRetryQuestions([
      { root: 'E', type: '', mode: 'ear', misses: 1, lastMissed: 'a' },
    ]);
    expect(questions).toEqual([{ root: 'E', type: '', mode: 'ear', source: 'miss' }]);
  });

  it('advances a miss-retry session until done', () => {
    let session = {
      kind: 'misses',
      questions: buildMissRetryQuestions([
        { root: 'C', type: '', mode: 'test', misses: 2, lastMissed: 'z' },
        { root: 'G', type: 'm', mode: 'ear', misses: 1, lastMissed: 'y' },
      ]),
      index: 0,
      results: [],
      done: false,
    };
    expect(session.questions).toHaveLength(2);
    session = advanceDrill(session, { missed: true });
    session = advanceDrill(session, {});
    expect(session.done).toBe(true);
    expect(drillCorrectCount(session)).toBe(1);
    expect(session.results).toHaveLength(2);
  });
});
