import { CHORD_FORMULAS, NOTE_TO_PC, ROOTS } from './constants.js';
import {
  questionFromSpec,
  targetPcsInChordOrder,
  voicePitchClasses,
} from './chords.js';

/**
 * Ear-quality drill (聽力辨型): hear a root-position chord and name its quality.
 * Sight quality (讀譜辨型) is a separate mode and is not implemented here.
 * The catalog is the shared quality list a future sight mode can reuse.
 */
export const EAR_QUALITY_TYPES = Object.freeze([
  '', 'm', 'aug', 'dim',
  '7', 'maj7', 'm7', 'm7b5', 'dim7',
  'sus2', 'sus4',
  '7b9', '9', 'maj9',
]);

export const EAR_QUALITY_LABEL_KEYS = Object.freeze({
  '': 'quality.major',
  m: 'quality.minor',
  aug: 'quality.aug',
  dim: 'quality.dim',
  '7': 'quality.dom7',
  maj7: 'quality.maj7',
  m7: 'quality.min7',
  m7b5: 'quality.halfDim7',
  dim7: 'quality.dim7',
  sus2: 'quality.sus2',
  sus4: 'quality.sus4',
  '7b9': 'quality.dom7b9',
  '9': 'quality.dom9',
  maj9: 'quality.maj9',
});

/** Triads only. The player builds any other mix by multi-selecting the pool. */
export const DEFAULT_EAR_QUALITY_POOL = Object.freeze(['', 'm', 'aug', 'dim']);

const QUALITY_SET = new Set(EAR_QUALITY_TYPES);

export function earQualityDomId(type) {
  return type === '' ? 'major' : String(type);
}

export function earQualityLabelKey(type) {
  return EAR_QUALITY_LABEL_KEYS[type] || 'quality.major';
}

export function normalizeEarQualityPool(raw) {
  if (!Array.isArray(raw)) return [...DEFAULT_EAR_QUALITY_POOL];
  const picked = new Set(raw.filter((type) => QUALITY_SET.has(type)));
  const pool = EAR_QUALITY_TYPES.filter((type) => picked.has(type));
  return pool.length ? pool : [...DEFAULT_EAR_QUALITY_POOL];
}

/** Toggle a quality. The pool always keeps at least one quality. */
export function toggleEarQuality(pool, type) {
  const current = normalizeEarQualityPool(pool);
  if (!QUALITY_SET.has(type)) return current;
  const picked = new Set(current);
  if (picked.has(type)) {
    if (picked.size === 1) return current;
    picked.delete(type);
  } else {
    picked.add(type);
  }
  return EAR_QUALITY_TYPES.filter((item) => picked.has(item));
}

/** Every quality in the catalog, in chip order. Does not clear a selection. */
export function selectAllEarQualities() {
  return [...EAR_QUALITY_TYPES];
}

export function earQualityPoolIsComplete(pool) {
  return normalizeEarQualityPool(pool).length === EAR_QUALITY_TYPES.length;
}

/**
 * Root position only. `inversion` is always 0 and the bass pitch class is the root.
 * There is no Easy / Medium / Hard tier — the pool is the whole drill definition.
 */
export function generateEarQualityQuestion(pool, lastName = null, random = Math.random) {
  const types = normalizeEarQualityPool(pool);
  let question;
  let attempts = 0;
  do {
    const root = ROOTS[Math.floor(random() * ROOTS.length)];
    const type = types[Math.floor(random() * types.length)];
    const tonePcs = targetPcsInChordOrder(root, type);
    const voicing = voicePitchClasses(tonePcs, 0, 60);
    question = {
      ...questionFromSpec(root, type),
      inversion: 0,
      tonePcs,
      voicing,
      bassPc: voicing[0] % 12,
    };
    attempts += 1;
  } while (question.name === lastName && attempts < 50);
  return question;
}

export function isRootPositionQuality(question) {
  if (!question || question.inversion !== 0) return false;
  const rootPc = NOTE_TO_PC[question.root];
  if (rootPc === undefined) return false;
  if (!question.voicing?.length) return false;
  return question.bassPc === rootPc && question.voicing[0] % 12 === rootPc;
}

/**
 * Every Listen quality is a real formula. Lookup-only formulas (6, add9, 11, 7alt, …)
 * are intentionally absent so this drill does not grow with the symbol list.
 */
export function earQualityCatalogMatchesFormulas() {
  const formulaKeys = new Set(Object.keys(CHORD_FORMULAS));
  return EAR_QUALITY_TYPES.length > 0
    && EAR_QUALITY_TYPES.every((key) => formulaKeys.has(key));
}
