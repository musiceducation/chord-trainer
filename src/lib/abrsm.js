/**
 * Roman-numeral chords for the free Roman trainer.
 *
 * Easy: the seven diatonic triads.
 *   major: I ii iii IV V vi vii°
 *   minor: i ii° III iv V VI vii°
 *     Minor keys use the harmonic minor, so V is major and vii° takes the
 *     leading tone. III is the major triad (natural seventh), not III+.
 * Medium: the seven diatonic sevenths, including V7.
 * Hard: a mixed pool of those triads, sevenths, and diatonic ninths.
 *
 * The prompt is always the key plus the figure. Play the chord. There is
 * no listening round. With inversions on, every figure is an inversion
 * (triads ⁶ / ⁶₄, sevenths and ninths ⁶₅ / ⁴₃ / ⁴₂) — never root position.
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

export const ABRSM5_DEGREES = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export const ABRSM5_MODE_FILTERS = Object.freeze(['both', 'major', 'minor']);
export const ROMAN_TIERS = Object.freeze(['easy', 'medium', 'hard']);

const TIER_ALIAS = Object.freeze({
  basic: 'easy',
  v7: 'medium',
  vOfV: 'hard',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
});

const FIG_6 = '\u2076';
const FIG_64 = '\u2076\u2084';
const FIG_65 = '\u2076\u2085';
const FIG_43 = '\u2074\u2083';
const FIG_42 = '\u2074\u2082';

const SUP_DIGIT = Object.freeze({
  '\u2076': '6',
  '\u2074': '4',
  '\u2079': '9',
  '\u2077': '7',
});
const SUB_DIGIT = Object.freeze({
  '\u2085': '5',
  '\u2084': '4',
  '\u2083': '3',
  '\u2082': '2',
});

export function normalizeRomanTier(tier) {
  return TIER_ALIAS[tier] || 'easy';
}

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

function interval(rootPc, tonePc) {
  return (tonePc - rootPc + 12) % 12;
}

function triadQuality(rootPc, thirdPc, fifthPc) {
  const third = interval(rootPc, thirdPc);
  const fifth = interval(rootPc, fifthPc);
  if (third === 4 && fifth === 7) return '';
  if (third === 3 && fifth === 7) return 'm';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return 'aug';
}

function seventhQuality(rootPc, thirdPc, fifthPc, seventhPc) {
  const third = interval(rootPc, thirdPc);
  const fifth = interval(rootPc, fifthPc);
  const seventh = interval(rootPc, seventhPc);
  if (third === 3 && fifth === 6 && seventh === 9) return 'dim7';
  if (third === 3 && fifth === 6 && seventh === 10) return 'm7b5';
  if (third === 3 && fifth === 7 && seventh === 10) return 'm7';
  if (third === 4 && fifth === 7 && seventh === 10) return '7';
  if (third === 4 && fifth === 7 && seventh === 11) return 'maj7';
  if (third === 4 && fifth === 8) return 'aug';
  return '7';
}

function ninthQuality(base, rootPc, ninthPc) {
  const ninth = interval(rootPc, ninthPc);
  const altered = ninth !== 2;
  if (base === 'maj7') return altered ? 'maj7b9' : 'maj9';
  if (base === 'm7') return altered ? 'm7b9' : 'm9';
  if (base === '7') return altered ? '7b9' : '9';
  if (base === 'm7b5') return altered ? 'm7b5b9' : 'm9b5';
  if (base === 'dim7') return altered ? 'dim7b9' : 'dim9';
  return altered ? '7b9' : '9';
}

function romanSymbol(degree, quality) {
  const upper = ROMAN_UPPER[degree - 1];
  const lower = upper.toLowerCase();
  switch (quality) {
    case 'm': return lower;
    case 'dim': return `${lower}\u00B0`;
    case 'aug': return `${upper}+`;
    case 'maj7': return `${upper}M7`;
    case 'm7': return `${lower}7`;
    case '7': return `${upper}7`;
    case 'm7b5': return `${lower}\u00F87`;
    case 'dim7': return `${lower}\u00B07`;
    case 'maj9': return `${upper}M9`;
    case 'm9': return `${lower}9`;
    case '9': return `${upper}9`;
    case '7b9': return `${upper}7b9`;
    case 'm7b9': return `${lower}7b9`;
    case 'maj7b9': return `${upper}M7b9`;
    case 'm7b5b9': return `${lower}\u00F87b9`;
    case 'm9b5': return `${lower}\u00F89`;
    case 'dim7b9': return `${lower}\u00B07b9`;
    case 'dim9': return `${lower}\u00B09`;
    default: return upper;
  }
}

function isNinthQuality(quality) {
  return quality === 'maj9' || quality === 'm9' || quality === '9'
    || quality === '7b9' || quality === 'm7b9' || quality === 'maj7b9'
    || quality === 'm7b5b9' || quality === 'm9b5' || quality === 'dim7b9'
    || quality === 'dim9';
}

export function formatRomanFigure(symbol, inversion = 0, { seventh = false, ninth = false } = {}) {
  const span = ninth ? 4 : seventh ? 3 : 2;
  const inv = Math.max(0, Math.min(inversion, span));
  const body = ninth || (!seventh && !symbol.endsWith('7'))
    ? symbol
    : symbol.slice(0, -1);
  if (inv === 1) return ninth || seventh ? `${body}${FIG_65}` : `${symbol}${FIG_6}`;
  if (inv === 2) return ninth || seventh ? `${body}${FIG_43}` : `${symbol}${FIG_64}`;
  if (inv === 3) return `${body}${FIG_42}`;
  return symbol;
}

/** Split a figure string into the numeral and the stacked bass figures. */
export function splitRomanFigure(text) {
  const chars = [...(text || '')];
  const stack = [];
  while (chars.length) {
    const ch = chars[chars.length - 1];
    if (SUB_DIGIT[ch]) {
      stack.unshift(SUB_DIGIT[ch]);
      chars.pop();
      continue;
    }
    if (SUP_DIGIT[ch]) {
      stack.unshift(SUP_DIGIT[ch]);
      chars.pop();
      continue;
    }
    break;
  }
  return { body: chars.join(''), stack, text: text || '' };
}

function leadSheet(rootName, quality) {
  if (quality === 'maj7') return `${rootName}maj7`;
  if (quality === 'maj9' || quality === 'maj7b9') return `${rootName}${quality === 'maj9' ? 'maj9' : 'maj7b9'}`;
  if (quality === 'm7') return `${rootName}m7`;
  if (quality === 'm9') return `${rootName}m9`;
  if (quality === 'm7b9') return `${rootName}m7b9`;
  if (quality === '7') return `${rootName}7`;
  if (quality === '9') return `${rootName}9`;
  if (quality === '7b9') return `${rootName}7b9`;
  if (quality === 'm7b5') return `${rootName}m7b5`;
  if (quality === 'm9b5') return `${rootName}m9b5`;
  if (quality === 'm7b5b9') return `${rootName}m7b5b9`;
  if (quality === 'dim7') return `${rootName}dim7`;
  if (quality === 'dim7b9') return `${rootName}dim7b9`;
  if (quality === 'dim9') return `${rootName}dim9`;
  if (quality === 'm') return `${rootName}m`;
  if (quality === 'dim') return `${rootName}dim`;
  if (quality === 'aug') return `${rootName}aug`;
  return rootName;
}

function tonesFromScale(scale, degree, steps, { lowerFifth = false } = {}) {
  const idx = degree - 1;
  const tones = steps.map((step) => scale[(idx + step) % 7]);
  if (lowerFifth && tones[2]) {
    const fifth = tones[2];
    const { letterIdx } = parseNote(fifth.name);
    const pc = (fifth.pc + 11) % 12;
    tones[2] = { name: spell(letterIdx, pc), pc };
  }
  return tones;
}

export function inversionsForKind(kind) {
  if (kind === 'triad') return [1, 2];
  return [1, 2, 3];
}

/** Specs included in a tier. Hard mixes triads, sevenths, and ninths. */
export function poolForTier(tier) {
  const resolved = normalizeRomanTier(tier);
  const triads = ABRSM5_DEGREES.map((degree) => ({ kind: 'triad', degree }));
  if (resolved === 'easy') return triads;
  const sevenths = ABRSM5_DEGREES.map((degree) => ({ kind: 'seventh', degree }));
  if (resolved === 'medium') return sevenths;
  const ninths = ABRSM5_DEGREES.map((degree) => ({ kind: 'ninth', degree }));
  return [...triads, ...sevenths, ...ninths];
}

export function buildAbrsmChord({
  tonic,
  mode,
  degree = 1,
  kind = 'triad',
  inversion = 0,
} = {}) {
  const scale = scaleSpelling(tonic, mode);
  const resolvedKind = kind === 'seventh' || kind === 'ninth' ? kind : 'triad';
  const steps = resolvedKind === 'ninth'
    ? [0, 2, 4, 6, 8]
    : resolvedKind === 'seventh'
      ? [0, 2, 4, 6]
      : [0, 2, 4];
  const lowerFifth = mode === 'minor' && degree === 3;
  const tones = tonesFromScale(scale, degree, steps, { lowerFifth });
  const rootPc = tones[0].pc;
  let quality;
  if (resolvedKind === 'triad') {
    quality = triadQuality(rootPc, tones[1].pc, tones[2].pc);
  } else {
    const seventh = seventhQuality(rootPc, tones[1].pc, tones[2].pc, tones[3].pc);
    quality = resolvedKind === 'ninth'
      ? ninthQuality(seventh, rootPc, tones[4].pc)
      : seventh;
  }
  const symbol = romanSymbol(degree, quality);
  const ninth = isNinthQuality(quality);
  const seventh = !ninth && resolvedKind !== 'triad';
  const maxInv = resolvedKind === 'triad' ? 2 : 3;
  const inv = Math.max(0, Math.min(inversion, maxInv));
  const tonePcs = tones.map((tone) => tone.pc);
  const voicing = voicePitchClasses(tonePcs, inv, 48);
  const figure = formatRomanFigure(symbol, inv, { seventh, ninth });

  return {
    tonic,
    mode,
    degree,
    kind: resolvedKind,
    inversion: inv,
    symbol,
    figure,
    figureParts: splitRomanFigure(figure),
    root: tones[0].name,
    quality,
    toneNames: tones.map((tone) => tone.name),
    tonePcs,
    pcs: new Set(tonePcs),
    bassPc: voicing[0] % 12,
    bassName: tones[inv].name,
    voicing,
    chordName: leadSheet(tones[0].name, quality),
    id: `${tonic}-${mode}-${resolvedKind}-${degree}-${inv}`,
  };
}

export function generateAbrsmQuestion({
  modeFilter = 'both',
  tier = 'easy',
  inversions = false,
  lastId = null,
  random = Math.random,
} = {}) {
  const modes = modeFilter === 'major' || modeFilter === 'minor' ? [modeFilter] : ['major', 'minor'];
  const resolvedTier = normalizeRomanTier(tier);
  const pool = poolForTier(resolvedTier);
  const pick = (list) => list[Math.floor(random() * list.length)];
  let question;
  let attempts = 0;
  do {
    const mode = pick(modes);
    const spec = pick(pool);
    const choices = inversions ? inversionsForKind(spec.kind) : [0];
    const inversion = choices.length === 1 ? choices[0] : pick(choices);
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
