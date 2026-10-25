export const NOTE_TO_PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export const PC_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_FORMULAS = {
  '': { intervals: [0, 4, 7], label: 'Major' },
  m: { intervals: [0, 3, 7], label: 'Minor' },
  dim: { intervals: [0, 3, 6], label: 'Diminished' },
  aug: { intervals: [0, 4, 8], label: 'Augmented' },
  sus2: { intervals: [0, 2, 7], label: 'Sus2' },
  sus4: { intervals: [0, 5, 7], label: 'Sus4' },
  maj7: { intervals: [0, 4, 7, 11], label: 'Major 7th' },
  m7: { intervals: [0, 3, 7, 10], label: 'Minor 7th' },
  '7': { intervals: [0, 4, 7, 10], label: 'Dominant 7th' },
  m7b5: { intervals: [0, 3, 6, 10], label: 'Half-Diminished' },
  dim7: { intervals: [0, 3, 6, 9], label: 'Diminished 7th' },
  '7b9': { intervals: [0, 4, 7, 10, 13], label: 'Dom 7♭9' },
  '9': { intervals: [0, 4, 7, 10, 14], label: 'Dominant 9th' },
  maj9: { intervals: [0, 4, 7, 11, 14], label: 'Major 9th' },
  // Lookup only. Keep these out of DIFFICULTY_LEVELS so Identify and Listen
  // still drill the original catalog. `6` is an integer key; chip order is
  // set in LOOKUP_QUALITY_TYPES, not by Object.keys.
  '6': { intervals: [0, 4, 7, 9], label: 'Major 6th' },
  m6: { intervals: [0, 3, 7, 9], label: 'Minor 6th' },
  add9: { intervals: [0, 4, 7, 14], label: 'Add9' },
  madd9: { intervals: [0, 3, 7, 14], label: 'Minor add9' },
  b5: { intervals: [0, 4, 6], label: 'Flat 5' },
  '#5': { intervals: [0, 4, 8], label: 'Sharp 5' },
  '7b5': { intervals: [0, 4, 6, 10], label: 'Dom 7♭5' },
  '7#5': { intervals: [0, 4, 8, 10], label: 'Dom 7♯5' },
  '7sus4': { intervals: [0, 5, 7, 10], label: '7sus4' },
  m9: { intervals: [0, 3, 7, 10, 14], label: 'Minor 9th' },
  // Jazz whitelist for Lookup typing only. Not chips (see LOOKUP_QUALITY_TYPES)
  // and not in DIFFICULTY_LEVELS, so Identify / Train / Listen / Roman stay put.
  // Intervals are the close stack `buildChordVoicing` plays: extensions are
  // compound, so the color tone sits on top. Fixed omissions, not a free stack:
  // 11 and maj11 drop the 3rd (minor 9th against the 11); 13, maj13, and m13
  // drop 5 and 11; m11 drops 5; 7b13 drops 5 because the b13 replaces it.
  // 7alt is one grip: 1, 3, b7, #9, b13. add4 is the close 4th, not add11.
  add4: { intervals: [0, 4, 5, 7], label: 'Add4' },
  '11': { intervals: [0, 7, 10, 14, 17], label: 'Dominant 11th' },
  '13': { intervals: [0, 4, 10, 14, 21], label: 'Dominant 13th' },
  maj11: { intervals: [0, 7, 11, 14, 17], label: 'Major 11th' },
  maj13: { intervals: [0, 4, 11, 14, 21], label: 'Major 13th' },
  m11: { intervals: [0, 3, 10, 14, 17], label: 'Minor 11th' },
  m13: { intervals: [0, 3, 10, 14, 21], label: 'Minor 13th' },
  '7#9': { intervals: [0, 4, 7, 10, 15], label: 'Dom 7♯9' },
  '7b13': { intervals: [0, 4, 10, 20], label: 'Dom 7♭13' },
  '7#11': { intervals: [0, 4, 7, 10, 18], label: 'Dom 7♯11' },
  'maj7#11': { intervals: [0, 4, 7, 11, 18], label: 'Maj7♯11' },
  '7alt': { intervals: [0, 4, 10, 15, 20], label: 'Altered' },
  'm(maj7)': { intervals: [0, 3, 7, 11], label: 'Minor-major 7th' },
  '69': { intervals: [0, 4, 7, 9, 14], label: '6/9' },
};

export const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Eb', 'F#', 'Ab', 'Bb'];

export const DIFFICULTY_LEVELS = {
  basic: { types: ['', 'm', 'dim', 'aug', 'sus2', 'sus4'] },
  seventh: { types: ['maj7', 'm7', '7', 'm7b5', 'dim7'] },
  extended: { types: ['7b9', '9', 'maj9'] },
  all: {
    types: ['', 'm', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'm7', '7', 'm7b5', 'dim7', '7b9', '9', 'maj9'],
  },
};

export const FULL_START = 36;
export const FULL_END = 84;
/** ~1.5 octaves of white keys (C → F of next+), enough for common chord voicings */
export const VISIBLE_WHITE_KEYS = 11;
/** ~2 octaves so first and second inversions fit without shifting up */
export const WIDE_VISIBLE_WHITE_KEYS = 16;

export const ALL_KEYS = [];
for (let m = FULL_START; m <= FULL_END; m++) {
  const pc = m % 12;
  ALL_KEYS.push({
    midi: m,
    pc,
    name: PC_TO_NOTE[pc],
    isBlack: [1, 3, 6, 8, 10].includes(pc),
    octave: Math.floor(m / 12) - 1,
  });
}

export const ACHIEVEMENTS = [
  { id: 'first', threshold: 1, type: 'correct' },
  { id: 'streak10', threshold: 10, type: 'streak' },
  { id: 'streak25', threshold: 25, type: 'streak' },
  { id: 'streak50', threshold: 50, type: 'streak' },
  { id: 'total50', threshold: 50, type: 'correct' },
  { id: 'total200', threshold: 200, type: 'correct' },
  { id: 'ear10', threshold: 10, type: 'ear' },
];

export const TABS = [
  { key: 'test', accent: 'rgba(122,162,247,0.4)' },
  { key: 'ear', accent: 'rgba(122,220,200,0.4)' },
  { key: 'listen', accent: 'rgba(125,196,247,0.4)' },
  { key: 'abrsm', accent: 'rgba(187,154,247,0.4)' },
  { key: 'progression', accent: 'rgba(122,162,247,0.4)' },
  { key: 'lookup', accent: 'rgba(240,208,128,0.45)' },
  { key: 'stats', accent: 'rgba(255,215,130,0.4)' },
];
