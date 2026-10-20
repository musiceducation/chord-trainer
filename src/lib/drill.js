export const MISS_BOOK_KEY = 'chordTrainerMissBook_v1';

export function chordId(question) {
  if (!question?.root) return '';
  return `${question.root}${question.type || ''}`;
}

export function emptyMissBook() {
  return { items: [] };
}

function asMode(mode) {
  if (mode === 'test' || mode === 'read') return mode;
  return 'ear';
}

function missIdentity({ root, type = '', mode } = {}) {
  const resolvedType = typeof type === 'string' ? type : '';
  const resolvedMode = asMode(mode);
  const base = `${root}${resolvedType}`;
  return {
    id: resolvedMode === 'read' ? `read:${base}` : base,
    type: resolvedType,
    mode: resolvedMode,
  };
}

function readDetails(item, mode) {
  if (mode !== 'read' || !item) return {};
  const details = {};
  const inversion = Number(item.inversion);
  if (Number.isInteger(inversion) && inversion >= 0 && inversion <= 3) details.inversion = inversion;
  if (typeof item.keyId === 'string' && item.keyId) details.keyId = item.keyId;
  return details;
}

/** Tab a miss-retry question should open. */
export function tabForDrillQuestion(question) {
  if (question?.mode === 'test' || question?.mode === 'read') return question.mode;
  return 'ear';
}

export function normalizeMissBook(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const byId = new Map();
  items.forEach((item) => {
    if (!item || typeof item.root !== 'string' || !item.root) return;
    const { id, type, mode } = missIdentity(item);
    const misses = Math.max(0, Number(item.misses) || 0);
    if (!misses) return;
    const prev = byId.get(id);
    const candidate = {
      id,
      root: item.root,
      type,
      mode,
      misses: (prev?.misses || 0) + misses,
      lastMissed: String(item.lastMissed || prev?.lastMissed || ''),
    };
    let details = readDetails(item, mode);
    if (prev && String(prev.lastMissed) > candidate.lastMissed) {
      candidate.lastMissed = prev.lastMissed;
      candidate.mode = prev.mode;
      details = readDetails(prev, prev.mode);
    }
    Object.assign(candidate, details);
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

export function recordMiss(book, {
  root,
  type = '',
  mode = 'ear',
  at = '',
  inversion,
  keyId,
} = {}) {
  if (!root) return normalizeMissBook(book);
  const normalized = normalizeMissBook(book);
  const identity = missIdentity({ root, type, mode: mode || undefined });
  const prev = normalized.items.find((item) => item.id === identity.id);
  const items = normalized.items.filter((item) => item.id !== identity.id);
  const resolvedMode = asMode(mode || prev?.mode);
  items.push({
    id: identity.id,
    root,
    type: identity.type,
    mode: resolvedMode,
    misses: (prev?.misses || 0) + 1,
    lastMissed: String(at || prev?.lastMissed || ''),
    ...readDetails(prev, resolvedMode),
    ...readDetails({ inversion, keyId }, resolvedMode),
  });
  return { items };
}

export function removeMiss(book, { root, type = '', mode } = {}) {
  if (!root) return normalizeMissBook(book);
  const { id } = missIdentity({ root, type, mode });
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
      inversion: question.inversion,
      keyId: question.keyId,
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
  const mode = asMode(miss.mode);
  const question = {
    root: miss.root,
    type: miss.type || '',
    mode,
    source: 'miss',
  };
  if (mode === 'read') {
    if (Number.isInteger(miss.inversion)) question.inversion = miss.inversion;
    if (miss.keyId) question.keyId = miss.keyId;
  }
  return question;
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

