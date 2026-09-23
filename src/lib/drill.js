import { generateQuestion } from './chords.js';

export const DRILL_SIZE = 5;
export const MISS_FILL_MAX = 3;
export const DRILL_PROMPT_AFTER = 5;
export const MISS_BOOK_KEY = 'chordTrainerMissBook_v1';
export const TODAY_KEY = 'chordTrainerTodayDrill_v1';

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function chordId(question) {
  if (!question?.root) return '';
  return `${question.root}${question.type || ''}`;
}

export function emptyMissBook() {
  return { items: [] };
}

function asMode(mode) {
  return mode === 'test' ? 'test' : 'ear';
}

export function normalizeMissBook(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const byId = new Map();
  items.forEach((item) => {
    if (!item || typeof item.root !== 'string' || !item.root) return;
    const type = typeof item.type === 'string' ? item.type : '';
    const id = `${item.root}${type}`;
    const misses = Math.max(0, Number(item.misses) || 0);
    if (!misses) return;
    const prev = byId.get(id);
    const candidate = {
      id,
      root: item.root,
      type,
      mode: asMode(item.mode),
      misses: (prev?.misses || 0) + misses,
      lastMissed: String(item.lastMissed || prev?.lastMissed || ''),
    };
    if (prev && String(prev.lastMissed) > candidate.lastMissed) {
      candidate.lastMissed = prev.lastMissed;
      candidate.mode = prev.mode;
    }
    byId.set(id, candidate);
  });
  return { items: [...byId.values()] };
}

export function loadMissBook(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return emptyMissBook();
  try {
    const raw = storage.getItem(MISS_BOOK_KEY);
    if (raw) return normalizeMissBook(JSON.parse(raw));
  } catch {
    // ignore corrupt data
  }
  return emptyMissBook();
}

export function saveMissBook(book, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    storage.setItem(MISS_BOOK_KEY, JSON.stringify(normalizeMissBook(book)));
    return true;
  } catch {
    return false;
  }
}

export function recordMiss(book, { root, type = '', mode = 'ear', at = '' } = {}) {
  if (!root) return normalizeMissBook(book);
  const normalized = normalizeMissBook(book);
  const id = `${root}${type || ''}`;
  const prev = normalized.items.find((item) => item.id === id);
  const items = normalized.items.filter((item) => item.id !== id);
  items.push({
    id,
    root,
    type: type || '',
    mode: asMode(mode || prev?.mode),
    misses: (prev?.misses || 0) + 1,
    lastMissed: String(at || prev?.lastMissed || ''),
  });
  return { items };
}

export function removeMiss(book, { root, type = '' } = {}) {
  if (!root) return normalizeMissBook(book);
  const id = `${root}${type || ''}`;
  return { items: normalizeMissBook(book).items.filter((item) => item.id !== id) };
}

export function applyRoundToBook(book, question, { missed = false, skipped = false, at = '' } = {}) {
  if (!question?.root) return normalizeMissBook(book);
  if (skipped && !missed) return normalizeMissBook(book);
  if (missed) {
    return recordMiss(book, {
      root: question.root,
      type: question.type,
      mode: question.mode,
      at,
    });
  }
  return removeMiss(book, question);
}

function rankMisses(misses) {
  return [...misses].sort((a, b) => (
    (b.misses - a.misses) || String(b.lastMissed).localeCompare(String(a.lastMissed))
  ));
}

function toDrillQuestion(miss) {
  return {
    root: miss.root,
    type: miss.type || '',
    mode: asMode(miss.mode),
    source: 'miss',
  };
}

export function buildTodayQuestions({
  difficulty = 'basic',
  misses = [],
  random = Math.random,
  size = DRILL_SIZE,
} = {}) {
  const questions = [];
  rankMisses(misses).forEach((miss) => {
    if (questions.length >= Math.min(MISS_FILL_MAX, size)) return;
    if (!miss?.root) return;
    if (questions.some((item) => chordId(item) === chordId(miss))) return;
    questions.push(toDrillQuestion(miss));
  });

  let lastName = null;
  let guard = 0;
  while (questions.length < size && guard < 40) {
    guard += 1;
    const generated = generateQuestion(difficulty, lastName, random);
    lastName = generated.name;
    if (questions.some((item) => chordId(item) === generated.name)) continue;
    questions.push({
      root: generated.root,
      type: generated.type,
      mode: questions.length % 2 === 0 ? 'test' : 'ear',
      source: 'new',
    });
  }
  return questions;
}

export function buildMissRetryQuestions(misses = []) {
  return rankMisses(misses).filter((miss) => miss?.root).map(toDrillQuestion);
}

export function advanceDrill(session, { missed = false, skipped = false } = {}) {
  if (!session?.questions?.length) return session;
  const current = session.questions[session.index];
  const results = [...(session.results || []), {
    id: chordId(current),
    correct: !missed && !skipped,
  }];
  const nextIndex = session.index + 1;
  const done = nextIndex >= session.questions.length;
  return {
    ...session,
    results,
    index: done ? session.index : nextIndex,
    done,
  };
}

export function drillCorrectCount(session) {
  return (session?.results || []).filter((result) => result.correct).length;
}

export function loadTodaySession(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(TODAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kind !== 'today' || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTodaySession(session, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage || session?.kind !== 'today') return false;
  try {
    storage.setItem(TODAY_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function createTodaySession({
  dateKey,
  difficulty,
  misses,
  random,
} = {}) {
  return {
    kind: 'today',
    dateKey,
    questions: buildTodayQuestions({ difficulty, misses, random }),
    index: 0,
    results: [],
    done: false,
  };
}
