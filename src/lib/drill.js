export const MISS_BOOK_KEY = 'chordTrainerMissBook_v1';

export function progressionMissId({ progressionId, quality, keyRoot } = {}) {
  return `prog:${progressionId}:${quality}:${keyRoot}`;
}

export function chordId(question) {
  if (question?.kind === 'progression') return progressionMissId(question);
  if (!question?.root) return '';
  return `${question.root}${question.type || ''}`;
}

export function emptyMissBook() {
  return { items: [] };
}

function asMode(mode) {
  return mode === 'test' ? 'test' : 'ear';
}

function normalizeProgressionItem(item) {
  if (!item || item.kind !== 'progression') return null;
  const progressionId = typeof item.progressionId === 'string' ? item.progressionId : '';
  const quality = item.quality === 'minor' ? 'minor' : item.quality === 'major' ? 'major' : '';
  const keyRoot = typeof item.keyRoot === 'string' ? item.keyRoot : '';
  if (!progressionId || !quality || !keyRoot) return null;
  const misses = Math.max(0, Number(item.misses) || 0);
  if (!misses) return null;
  return {
    id: progressionMissId({ progressionId, quality, keyRoot }),
    kind: 'progression',
    progressionId,
    quality,
    keyRoot,
    mode: 'progression',
    misses,
    lastMissed: String(item.lastMissed || ''),
  };
}

export function normalizeMissBook(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const byId = new Map();
  items.forEach((item) => {
    const progression = normalizeProgressionItem(item);
    if (progression) {
      const prev = byId.get(progression.id);
      const candidate = {
        ...progression,
        misses: (prev?.misses || 0) + progression.misses,
        lastMissed: String(progression.lastMissed || prev?.lastMissed || ''),
      };
      if (prev && String(prev.lastMissed) > candidate.lastMissed) {
        candidate.lastMissed = prev.lastMissed;
      }
      byId.set(progression.id, candidate);
      return;
    }
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

export function recordMiss(book, entry = {}) {
  if (entry.kind === 'progression') {
    const normalized = normalizeMissBook(book);
    const id = progressionMissId(entry);
    const prev = normalized.items.find((item) => item.id === id);
    const items = normalized.items.filter((item) => item.id !== id);
    const next = normalizeProgressionItem({
      ...entry,
      kind: 'progression',
      misses: (prev?.misses || 0) + 1,
      lastMissed: String(entry.at || prev?.lastMissed || ''),
    });
    if (!next) return normalized;
    items.push(next);
    return { items };
  }
  const { root, type = '', mode = 'ear', at = '' } = entry;
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

export function removeMiss(book, entry = {}) {
  if (entry.kind === 'progression') {
    const id = progressionMissId(entry);
    return { items: normalizeMissBook(book).items.filter((item) => item.id !== id) };
  }
  const { root, type = '' } = entry;
  if (!root) return normalizeMissBook(book);
  const id = `${root}${type || ''}`;
  return { items: normalizeMissBook(book).items.filter((item) => item.id !== id) };
}

export function applyRoundToBook(book, question, { missed = false, skipped = false, at = '' } = {}) {
  if (question?.kind === 'progression') {
    if (skipped && !missed) return normalizeMissBook(book);
    if (missed) return recordMiss(book, { ...question, at });
    return removeMiss(book, question);
  }
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
  if (miss.kind === 'progression') {
    return {
      kind: 'progression',
      mode: 'progression',
      progressionId: miss.progressionId,
      quality: miss.quality,
      keyRoot: miss.keyRoot,
      source: 'miss',
    };
  }
  return {
    root: miss.root,
    type: miss.type || '',
    mode: asMode(miss.mode),
    source: 'miss',
  };
}

export function buildMissRetryQuestions(misses = []) {
  return rankMisses(misses)
    .filter((miss) => miss?.root || miss?.kind === 'progression')
    .map(toDrillQuestion);
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

