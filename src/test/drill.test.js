import { describe, it, expect } from 'vitest';
import {
  advanceDrill,
  applyRoundToBook,
  buildMissRetryQuestions,
  buildTodayQuestions,
  createTodaySession,
  drillCorrectCount,
  hashSeed,
  loadMissBook,
  loadTodaySession,
  localDateKey,
  mulberry32,
  recordMiss,
  removeMiss,
  saveMissBook,
  saveTodaySession,
} from '../lib/drill.js';

class MemoryStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = v; }
}

function sequenceRandom() {
  let n = 0;
  return () => {
    n += 1;
    return (n % 97) / 97;
  };
}

describe('miss book', () => {
  it('records a miss once per chord and clears it after a clean answer', () => {
    let book = recordMiss(null, { root: 'C', type: 'm', mode: 'ear', at: '2026-09-23T01:00:00.000Z' });
    book = recordMiss(book, { root: 'C', type: 'm', mode: 'test', at: '2026-09-23T02:00:00.000Z' });
    expect(book.items).toHaveLength(1);
    expect(book.items[0]).toMatchObject({ id: 'Cm', misses: 2, mode: 'test' });

    book = applyRoundToBook(book, { root: 'C', type: 'm', mode: 'ear' }, { missed: false });
    expect(book.items).toEqual([]);
  });

  it('keeps a miss when the round was skipped after a wrong note', () => {
    const book = applyRoundToBook(
      { items: [] },
      { root: 'G', type: '7', mode: 'test' },
      { missed: true, skipped: true, at: 't' },
    );
    expect(book.items[0].id).toBe('G7');
    const skippedClean = applyRoundToBook(book, { root: 'D', type: '', mode: 'ear' }, { skipped: true });
    expect(skippedClean.items.map((item) => item.id)).toEqual(['G7']);
  });

  it('persists the book and drops empty misses', () => {
    const storage = new MemoryStorage();
    saveMissBook({
      items: [
        { root: 'A', type: 'm', mode: 'ear', misses: 1, lastMissed: 'a' },
        { root: 'F', type: '', mode: 'test', misses: 0 },
      ],
    }, storage);
    expect(loadMissBook(storage).items.map((item) => item.id)).toEqual(['Am']);
    expect(removeMiss(loadMissBook(storage), { root: 'A', type: 'm' }).items).toEqual([]);
  });
});

describe('today and retry drills', () => {
  it('builds the same five questions for a date seed, misses first', () => {
    const misses = [
      { root: 'A', type: 'm', mode: 'test', misses: 4, lastMissed: '2' },
      { root: 'D', type: 'm', mode: 'ear', misses: 1, lastMissed: '1' },
      { root: 'F', type: '', mode: 'ear', misses: 3, lastMissed: '3' },
      { root: 'B', type: 'dim', mode: 'test', misses: 2, lastMissed: '4' },
    ];
    const random = mulberry32(hashSeed('2026-09-23:basic'));
    const first = buildTodayQuestions({ difficulty: 'basic', misses, random });
    const second = buildTodayQuestions({
      difficulty: 'basic',
      misses,
      random: mulberry32(hashSeed('2026-09-23:basic')),
    });
    expect(first).toHaveLength(5);
    expect(first.map((q) => q.root + q.type)).toEqual(second.map((q) => q.root + q.type));
    expect(first.slice(0, 3).map((q) => q.root + q.type)).toEqual(['Am', 'F', 'Bdim']);
    expect(first.slice(0, 3).every((q) => q.source === 'miss')).toBe(true);
    expect(first.filter((q) => q.source === 'new')).toHaveLength(2);
  });

  it('retries only chords in the miss book', () => {
    const questions = buildMissRetryQuestions([
      { root: 'E', type: '', mode: 'ear', misses: 1, lastMissed: 'a' },
    ]);
    expect(questions).toEqual([{ root: 'E', type: '', mode: 'ear', source: 'miss' }]);
  });

  it('advances today until five results are in and can resume from storage', () => {
    const storage = new MemoryStorage();
    let session = createTodaySession({
      dateKey: '2026-09-23',
      difficulty: 'basic',
      misses: [],
      random: sequenceRandom(),
    });
    expect(session.questions.length).toBeGreaterThan(0);
    session = advanceDrill(session, { missed: true });
    session = advanceDrill(session, { skipped: true });
    expect(drillCorrectCount(session)).toBe(0);
    expect(session.done).toBe(false);
    while (!session.done) session = advanceDrill(session, {});
    expect(session.results).toHaveLength(session.questions.length);
    expect(session.done).toBe(true);
    expect(saveTodaySession(session, storage)).toBe(true);
    expect(loadTodaySession(storage).done).toBe(true);
    expect(localDateKey(new Date(2026, 8, 23))).toBe('2026-09-23');
  });
});
