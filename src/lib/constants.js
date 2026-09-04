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
  { key: 'progression', accent: 'rgba(122,162,247,0.4)' },
  { key: 'stats', accent: 'rgba(255,215,130,0.4)' },
];
