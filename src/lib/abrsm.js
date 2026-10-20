/**
 * Roman-numeral chords for the free Roman trainer.
 *
 * Basic: all seven diatonic triads.
 *   major: I ii iii IV V vi vii°
 *   minor: i ii° III iv V VI vii°
 *     Minor keys use the harmonic minor, so V is major and vii° takes the
 *     leading tone. III is the major triad (natural seventh), not the
 *     augmented III+ that stacking thirds on the harmonic minor would make.
 * +V7: basic plus a dominant seventh on V (`V7`).
 * +V/V: +V7 plus the secondary dominant of V as a major triad (`V/V`).
 *
 * Augmented `+` (for example a future III+ tier) is intentionally absent
 * from the basic, +V7, and +V/V pools.
 *
 * Inversions use standard figures as the prompt to play (see the figure,
 * play the chord). Triads: ⁶ and ⁶₄. V7 (root / 1st / 2nd only in v1; no
 * third inversion): V7, V⁶₅, V⁴₃. Secondary dominants put the figure on the
 * first V: V⁶/V, V⁶₄/V. Grading stays bass-aware. Roman never offers a
 * listen-and-pick list.
 */

import { voicePitchClasses } from './chords.js';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 11];
const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export const ABRSM5_KEYS = Object.freeze({
  major: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  minor: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'],
});

/** Basic-tier degrees: every diatonic triad, not only I / II / IV / V. */
export const ABRSM5_DEGREES = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export const ABRSM5_MODE_FILTERS = Object.freeze(['both', 'major', 'minor']);
export const ROMAN_TIERS = Object.freeze(['basic', 'v7', 'vOfV']);
export const ROMAN_INVERSIONS = Object.freeze([0, 1, 2]);

const FIG_6 = '\u2076';
const FIG_64 = '\u2076\u2084';
const FIG_65 = '\u2076\u2085';
const FIG_43 = '\u2074\u2083';

function parseNote(name) {
  const letterIdx = LETTERS.indexOf(name?.[0]);
  if (letterIdx < 0) throw new Error(`Unknown note: ${name}`);
  let offset = 0;
  for (const ch of name.slice(1)) {
    if (ch === '#') offset += 1;
    else if (ch === 'b') offset -= 1;
    else if (ch === 'x') offset += 2;
  }
  return { letterIdx, pc: (NATURAL_PC[letterIdx] + offset + 12) % 12 };
}

function spell(letterIdx, pc) {
  const offset = ((pc - NATURAL_PC[letterIdx] + 18) % 12) - 6;
  let accidental = '';
  if (offset === 2) accidental = 'x';
  else if (offset > 0) accidental = '#'.repeat(offset);
  else if (offset < 0) accidental = 'b'.repeat(-offset);
  return LETTERS[letterIdx] + accidental;
}

function namedInterval(root, letterSteps, semitones) {
  const { letterIdx } = parseNote(root.name);
  const pc = (root.pc + semitones) % 12;
  return { name: spell((letterIdx + letterSteps) % 7, pc), pc };
}

/** Seven correctly spelled scale notes; minor keys use the harmonic minor. */
export function scaleSpelling(tonic, mode) {
  const { letterIdx, pc } = parseNote(tonic);
  const steps = mode === 'minor' ? HARMONIC_MINOR_STEPS : MAJOR_STEPS;
  return steps.map((step, i) => {
    const notePc = (pc + step) % 12;
    const idx = (letterIdx + i) % 7;
    return { name: spell(idx, notePc), pc: notePc };
  });
}

function triadQuality(rootPc, thirdPc, fifthPc) {
  const third = (thirdPc - rootPc + 12) % 12;
  const fifth = (fifthPc - rootPc + 12) % 12;
  if (third === 4 && fifth === 7) return '';
  if (third === 3 && fifth === 7) return 'm';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return 'aug';
}

function diatonicSymbol(degree, quality) {
  const upper = ROMAN_UPPER[degree - 1];
  if (quality === 'dim') return `${upper.toLowerCase()}\u00B0`;
  if (quality === 'm') return upper.toLowerCase();
  // `+` is reserved for a later tier and is not produced by shipped pools.
  if (quality === 'aug') return `${upper}+`;
  return upper;
}

export function formatRomanFigure(symbol, inversion = 0, { seventh = false } = {}) {
  const inv = ((inversion % 3) + 3) % 3;
  if (symbol === 'V/V') {
    if (inv === 1) return `V${FIG_6}/V`;
    if (inv === 2) return `V${FIG_64}/V`;
    return 'V/V';
  }
  if (seventh || symbol === 'V7') {
    if (inv === 1) return `V${FIG_65}`;
    if (inv === 2) return `V${FIG_43}`;
    return 'V7';
  }
  if (inv === 1) return `${symbol}${FIG_6}`;
  if (inv === 2) return `${symbol}${FIG_64}`;
  return symbol;
}

function leadSheet(rootName, quality) {
  if (quality === '7') return `${rootName}7`;
  if (quality === 'm') return `${rootName}m`;
  if (quality === 'dim') return `${rootName}dim`;
  if (quality === 'aug') return `${rootName}aug`;
  return rootName;
}

function triadFromScale(scale, degree, { lowerFifth = false } = {}) {
  const idx = degree - 1;
  const tones = [scale[idx], scale[(idx + 2) % 7], scale[(idx + 4) % 7]];
  if (lowerFifth) {
    const fifth = tones[2];
    const { letterIdx } = parseNote(fifth.name);
    const pc = (fifth.pc + 11) % 12;
    tones[2] = { name: spell(letterIdx, pc), pc };
  }
  return tones;
}

/** Specs included in a tier. Each later tier adds to the previous pool. */
export function poolForTier(tier) {
  const triads = ABRSM5_DEGREES.map((degree) => ({ kind: 'triad', degree }));
  if (tier === 'v7' || tier === 'vOfV') triads.push({ kind: 'V7', degree: 5 });
  if (tier === 'vOfV') triads.push({ kind: 'V/V', degree: 2 });
  return triads;
}

export function buildAbrsmChord({
  tonic,
  mode,
  degree = 1,
  kind = 'triad',
  inversion = 0,
} = {}) {
  const scale = scaleSpelling(tonic, mode);
  const resolvedKind = kind === 'V7' || kind === 'V/V' ? kind : 'triad';
  const resolvedDegree = resolvedKind === 'V7' ? 5 : resolvedKind === 'V/V' ? 2 : degree;
  let tones;
  if (resolvedKind === 'V7') {
    tones = [scale[4], scale[6], scale[1], scale[3]];
  } else if (resolvedKind === 'V/V') {
    const root = scale[1];
    tones = [root, namedInterval(root, 2, 4), namedInterval(root, 4, 7)];
  } else {
    // Harmonic-minor III would be augmented; basic harmony uses major III.
    const lowerFifth = mode === 'minor' && resolvedDegree === 3;
    tones = triadFromScale(scale, resolvedDegree, { lowerFifth });
  }

  const quality = resolvedKind === 'V7'
    ? '7'
    : triadQuality(tones[0].pc, tones[1].pc, tones[2].pc);
  const symbol = resolvedKind === 'V7'
    ? 'V7'
    : resolvedKind === 'V/V'
      ? 'V/V'
      : diatonicSymbol(resolvedDegree, quality);
  const seventh = resolvedKind === 'V7';
  const inv = ROMAN_INVERSIONS.includes(inversion) ? inversion : 0;
  const tonePcs = tones.map((tone) => tone.pc);
  const voicing = voicePitchClasses(tonePcs, inv, 48);

  return {
    tonic,
    mode,
    degree: resolvedDegree,
    kind: resolvedKind,
    inversion: inv,
    symbol,
    figure: formatRomanFigure(symbol, inv, { seventh }),
    root: tones[0].name,
    quality,
    toneNames: tones.map((tone) => tone.name),
    tonePcs,
    pcs: new Set(tonePcs),
    bassPc: voicing[0] % 12,
    voicing,
    chordName: leadSheet(tones[0].name, quality),
    id: `${tonic}-${mode}-${resolvedKind}-${resolvedDegree}-${inv}`,
  };
}

export function generateAbrsmQuestion({
  modeFilter = 'both',
  tier = 'basic',
  inversions = false,
  lastId = null,
  random = Math.random,
} = {}) {
  const modes = modeFilter === 'major' || modeFilter === 'minor' ? [modeFilter] : ['major', 'minor'];
  const resolvedTier = ROMAN_TIERS.includes(tier) ? tier : 'basic';
  const pool = poolForTier(resolvedTier);
  const pick = (list) => list[Math.floor(random() * list.length)];
  let question;
  let attempts = 0;
  do {
    const mode = pick(modes);
    const spec = pick(pool);
    const inversion = inversions ? pick(ROMAN_INVERSIONS) : 0;
    question = buildAbrsmChord({
      tonic: pick(ABRSM5_KEYS[mode]),
      mode,
      kind: spec.kind,
      degree: spec.degree,
      inversion,
    });
    attempts += 1;
  } while (question.id === lastId && attempts < 50);

  return question;
}
