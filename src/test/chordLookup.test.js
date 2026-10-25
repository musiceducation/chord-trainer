import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Keyboard } from '../components/Keyboard.jsx';
import { LookupMode, lookupPianoHighlight } from '../components/LookupMode.jsx';
import { buildChordVoicing, chordTypeI18nKey } from '../lib/chords.js';
import {
  LOOKUP_LOOP_GAP_MS,
  LOOKUP_QUALITY_ALIASES,
  LOOKUP_QUALITY_TYPES,
  LOOKUP_QUEUE_MAX,
  appendLookupQueue,
  chordForLookupQueue,
  lookupFromPick,
  lookupFromSymbol,
  lookupLoopStep,
  parseChordSymbol,
  removeLookupQueueAt,
  runLookupLoop,
  supportedChordFormatList,
} from '../lib/chordLookup.js';
import { ALL_KEYS, CHORD_FORMULAS, DIFFICULTY_LEVELS, FULL_END, FULL_START, NOTE_TO_PC } from '../lib/constants.js';
import { EAR_QUALITY_TYPES } from '../lib/earQuality.js';
import { STRINGS } from '../lib/i18n.js';
import { visibleKeysForStart } from '../lib/keyboardRange.js';

function markedLabels(html, kind) {
  return [...html.matchAll(new RegExp(`aria-label="([^"]+)"(?=[^>]*key-${kind}-(?:white|black))`, 'g'))].map((match) => match[1]);
}

function keyTag(html, label) {
  return html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';
}

function labelsFor(midis) {
  return ALL_KEYS.filter((key) => midis.includes(key.midi)).map((key) => `${key.name}${key.octave}`);
}

function openTag(html, testId) {
  const match = html.match(new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`));
  return match?.[0] ?? '';
}

const LOOKUP_ONLY = ['6', 'm6', 'add9', 'madd9', 'b5', '#5', '7b5', '7#5', '7sus4', 'm9'];

describe('chord symbol lookup', () => {
  it('parses symbols that map onto CHORD_FORMULAS', () => {
    expect(parseChordSymbol('F#sus2')).toEqual({ ok: true, root: 'F#', type: 'sus2', bass: null, name: 'F#sus2' });
    expect(parseChordSymbol('Am7')).toEqual({ ok: true, root: 'A', type: 'm7', bass: null, name: 'Am7' });
    expect(parseChordSymbol('am7')).toEqual({ ok: true, root: 'A', type: 'm7', bass: null, name: 'Am7' });
    expect(parseChordSymbol('Cmaj7')).toEqual({ ok: true, root: 'C', type: 'maj7', bass: null, name: 'Cmaj7' });
    expect(parseChordSymbol('C')).toEqual({ ok: true, root: 'C', type: '', bass: null, name: 'C' });
    expect(parseChordSymbol('Bb7')).toEqual({ ok: true, root: 'Bb', type: '7', bass: null, name: 'Bb7' });
    expect(parseChordSymbol('Ebdim7')).toEqual({ ok: true, root: 'Eb', type: 'dim7', bass: null, name: 'Ebdim7' });
    expect(parseChordSymbol('G7b9')).toEqual({ ok: true, root: 'G', type: '7b9', bass: null, name: 'G7b9' });
    expect(parseChordSymbol('Cm7b5')).toEqual({ ok: true, root: 'C', type: 'm7b5', bass: null, name: 'Cm7b5' });
    expect(parseChordSymbol('  Cmaj9  ')).toEqual({ ok: true, root: 'C', type: 'maj9', bass: null, name: 'Cmaj9' });
    expect(parseChordSymbol('Dbmaj7')).toMatchObject({ root: 'Db', type: 'maj7', bass: null });
    expect(parseChordSymbol('Bb9')).toMatchObject({ root: 'Bb', type: '9', name: 'Bb9' });
  });

  it('parses the curated qualities and an optional slash bass', () => {
    expect(parseChordSymbol('C6')).toEqual({ ok: true, root: 'C', type: '6', bass: null, name: 'C6' });
    expect(parseChordSymbol('Cm6')).toMatchObject({ root: 'C', type: 'm6', name: 'Cm6' });
    expect(parseChordSymbol('Fadd9')).toMatchObject({ root: 'F', type: 'add9', name: 'Fadd9' });
    expect(parseChordSymbol('Cmadd9')).toMatchObject({ root: 'C', type: 'madd9', name: 'Cmadd9' });
    expect(parseChordSymbol('Cb5')).toEqual({ ok: true, root: 'C', type: 'b5', bass: null, name: 'Cb5' });
    expect(parseChordSymbol('C#5')).toEqual({ ok: true, root: 'C', type: '#5', bass: null, name: 'C#5' });
    expect(parseChordSymbol('C7b5')).toMatchObject({ root: 'C', type: '7b5' });
    expect(parseChordSymbol('C7#5')).toMatchObject({ root: 'C', type: '7#5' });
    expect(parseChordSymbol('C7♭5')).toMatchObject({ root: 'C', type: '7b5', name: 'C7b5' });
    expect(parseChordSymbol('C7sus4')).toMatchObject({ root: 'C', type: '7sus4' });
    expect(parseChordSymbol('Cm9')).toMatchObject({ root: 'C', type: 'm9' });
    expect(parseChordSymbol('Gbb5')).toMatchObject({ root: 'Gb', type: 'b5', name: 'Gbb5' });
    expect(parseChordSymbol('C##5')).toMatchObject({ root: 'C#', type: '#5', name: 'C##5' });
    expect(parseChordSymbol('Bbadd9')).toMatchObject({ root: 'Bb', type: 'add9', name: 'Bbadd9' });

    expect(parseChordSymbol('C/E')).toEqual({ ok: true, root: 'C', type: '', bass: 'E', name: 'C/E' });
    expect(parseChordSymbol('am7/g')).toEqual({ ok: true, root: 'A', type: 'm7', bass: 'G', name: 'Am7/G' });
    expect(parseChordSymbol('Cmaj7/B')).toMatchObject({ root: 'C', type: 'maj7', bass: 'B', name: 'Cmaj7/B' });
    expect(parseChordSymbol('F#/A#')).toMatchObject({ root: 'F#', type: '', bass: 'A#', name: 'F#/A#' });
    expect(parseChordSymbol('C/E♭')).toMatchObject({ root: 'C', type: '', bass: 'Eb', name: 'C/Eb' });
    expect(parseChordSymbol('C♯/E')).toMatchObject({ root: 'C#', type: '', bass: 'E', name: 'C#/E' });
    expect(parseChordSymbol('  Am7/G  ')).toMatchObject({ name: 'Am7/G' });
  });

  it('rejects unknown qualities, bad bass notes, polychords, and mega-stacks', () => {
    const unsupported = [
      '',
      '   ',
      'C9add',
      'C/E/G',
      'C/',
      'C/H',
      'C/Fb',
      'C/E#',
      'C+',
      'H7',
      'C sus2',
      'CMaj7',
      'Cmin7',
      'Cmaj7#11b13',
      'Cmaj7add2#11',
      'Cadd11',
      'C7altb9',
      'Cm6/9',
      'C/9',
      'C6/9/E',
    ];
    for (const symbol of unsupported) {
      const parsed = parseChordSymbol(symbol);
      expect(parsed.ok, symbol).toBe(false);
      const looked = lookupFromSymbol(symbol);
      expect(looked.ok, symbol).toBe(false);
      expect(looked.voicing, symbol).toBeUndefined();
      expect(looked.formats, symbol).toContain('/bass');
      expect(looked.formats, symbol).toContain('add9');
    }
  });

  it('lists every formula in musical order, then slash bass, without changing practice', () => {
    const listed = supportedChordFormatList().split(', ');
    expect(listed.at(-1)).toBe('/bass');
    const tokens = new Set(listed.slice(0, -1).flatMap((group) => (
      group === '69/6/9' ? ['69', '6/9'] : group.split('/')
    )));
    for (const type of Object.keys(CHORD_FORMULAS)) {
      expect(tokens.has(type || 'major'), type || 'major').toBe(true);
    }
    for (const alias of Object.keys(LOOKUP_QUALITY_ALIASES)) {
      expect(tokens.has(alias), alias).toBe(true);
      expect(CHORD_FORMULAS, alias).toHaveProperty(LOOKUP_QUALITY_ALIASES[alias]);
    }
    expect(tokens.has('6/9')).toBe(true);
    expect(supportedChordFormatList()).not.toContain('maj7#11b13');
    expect(supportedChordFormatList()).not.toContain('add11');
    expect(LOOKUP_QUALITY_TYPES).toEqual([...DIFFICULTY_LEVELS.all.types, ...LOOKUP_ONLY]);
    expect(DIFFICULTY_LEVELS.all.types).toEqual([
      '', 'm', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'm7', '7', 'm7b5', 'dim7', '7b9', '9', 'maj9',
    ]);
    const jazzTypes = ['add4', '11', '13', 'maj11', 'maj13', 'm11', 'm13', '7#9', '7b13', '7#11', 'maj7#11', '7alt', 'm(maj7)', '69'];
    expect(new Set(Object.keys(CHORD_FORMULAS).filter((type) => !LOOKUP_QUALITY_TYPES.includes(type)))).toEqual(new Set(jazzTypes));
    for (const type of [...LOOKUP_ONLY, ...jazzTypes]) {
      expect(DIFFICULTY_LEVELS.basic.types).not.toContain(type);
      expect(DIFFICULTY_LEVELS.seventh.types).not.toContain(type);
      expect(DIFFICULTY_LEVELS.extended.types).not.toContain(type);
      expect(DIFFICULTY_LEVELS.all.types).not.toContain(type);
      expect(EAR_QUALITY_TYPES, type).not.toContain(type);
      expect(STRINGS.en[chordTypeI18nKey(type)], type).toBe(CHORD_FORMULAS[type].label);
      expect(STRINGS['zh-Hant'][chordTypeI18nKey(type)], type).toBeTruthy();
      expect(STRINGS['zh-Hans'][chordTypeI18nKey(type)], type).toBeTruthy();
    }
    for (const type of jazzTypes) {
      expect(LOOKUP_QUALITY_TYPES, type).not.toContain(type);
    }
    expect(STRINGS['zh-Hant']['chordType.add9']).toBe('加九和弦');
    expect(STRINGS['zh-Hant']['chordType.dom7sus4']).toBe('屬七掛四');
    expect(STRINGS['zh-Hans']['chordType.m9']).toBe('小九和弦');
    expect(STRINGS['zh-Hans']['chordType.dom7sus4']).toBe('属七挂四');
    expect(STRINGS['zh-Hant']['chordType.dom11']).toBe('屬十一和弦');
    expect(STRINGS['zh-Hans']['chordType.alt']).toBe('变化属七');
    expect(STRINGS.en['lookup.error']).toContain('F#maj7add2');
  });

  it('parses the jazz whitelist onto one close voicing and leaves stacks closed', () => {
    const recipes = {
      add4: [0, 4, 5, 7],
      '11': [0, 7, 10, 14, 17],
      '13': [0, 4, 10, 14, 21],
      maj11: [0, 7, 11, 14, 17],
      maj13: [0, 4, 11, 14, 21],
      m11: [0, 3, 10, 14, 17],
      m13: [0, 3, 10, 14, 21],
      '7#9': [0, 4, 7, 10, 15],
      '7b13': [0, 4, 10, 20],
      '7#11': [0, 4, 7, 10, 18],
      'maj7#11': [0, 4, 7, 11, 18],
      '7alt': [0, 4, 10, 15, 20],
      'm(maj7)': [0, 3, 7, 11],
      '69': [0, 4, 7, 9, 14],
    };
    for (const [type, intervals] of Object.entries(recipes)) {
      expect(CHORD_FORMULAS[type].intervals, type).toEqual(intervals);
      const pcs = new Set(intervals.map((interval) => interval % 12));
      expect(pcs.size, type).toBe(intervals.length);
    }

    const accepted = [
      ['F#maj7add2', 'F#', 'maj9', 'F#maj9'],
      ['F#maj7add9', 'F#', 'maj9', 'F#maj9'],
      ['Cadd2', 'C', 'add9', 'Cadd9'],
      ['Cmadd2', 'C', 'madd9', 'Cmadd9'],
      ['Dm7add2', 'D', 'm9', 'Dm9'],
      ['G7add2', 'G', '9', 'G9'],
      ['Bb7add9', 'Bb', '9', 'Bb9'],
      ['G11', 'G', '11', 'G11'],
      ['A13', 'A', '13', 'A13'],
      ['Dm11', 'D', 'm11', 'Dm11'],
      ['Em13', 'E', 'm13', 'Em13'],
      ['Cmaj13', 'C', 'maj13', 'Cmaj13'],
      ['Fmaj11', 'F', 'maj11', 'Fmaj11'],
      ['E7alt', 'E', '7alt', 'E7alt'],
      ['Ealt', 'E', '7alt', 'E7alt'],
      ['B7#9', 'B', '7#9', 'B7#9'],
      ['Ab7b13', 'Ab', '7b13', 'Ab7b13'],
      ['C7#11', 'C', '7#11', 'C7#11'],
      ['Fmaj7#11', 'F', 'maj7#11', 'Fmaj7#11'],
      ['Am(maj7)', 'A', 'm(maj7)', 'Am(maj7)'],
      ['AmM7', 'A', 'm(maj7)', 'Am(maj7)'],
      ['Ammaj7', 'A', 'm(maj7)', 'Am(maj7)'],
      ['AminMaj7', 'A', 'm(maj7)', 'Am(maj7)'],
      ['C69', 'C', '69', 'C69'],
      ['C6/9', 'C', '69', 'C69'],
      ['F#6/9', 'F#', '69', 'F#69'],
      ['CM7', 'C', 'maj7', 'Cmaj7'],
      ['Cmin', 'C', 'm', 'Cm'],
      ['Cø', 'C', 'm7b5', 'Cm7b5'],
      ['Bbø7', 'Bb', 'm7b5', 'Bbm7b5'],
      ['DØ7', 'D', 'm7b5', 'Dm7b5'],
      ['C°', 'C', 'dim', 'Cdim'],
      ['F°7', 'F', 'dim7', 'Fdim7'],
      ['Fadd4', 'F', 'add4', 'Fadd4'],
      ['C#11', 'C#', '11', 'C#11'],
    ];
    for (const [symbol, root, type, name] of accepted) {
      expect(parseChordSymbol(symbol), symbol).toEqual({ ok: true, root, type, bass: null, name });
      const found = lookupFromSymbol(symbol);
      expect(found.ok, symbol).toBe(true);
      expect(found.voicing, symbol).toEqual(buildChordVoicing(root, type, found.voicing[0] < 60 ? 48 : 60));
      expect(found.voicing, symbol).toHaveLength(CHORD_FORMULAS[type].intervals.length);
      expect(found.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END), symbol).toBe(true);
      const rootPc = NOTE_TO_PC[root];
      expect(found.voicing.map((midi) => (midi - found.voicing[0] + rootPc + 120) % 12), symbol).toEqual(
        CHORD_FORMULAS[type].intervals.map((interval) => (rootPc + interval) % 12),
      );
      for (let i = 1; i < found.voicing.length; i += 1) {
        expect(found.voicing[i], symbol).toBeGreaterThan(found.voicing[i - 1]);
      }
    }

    expect(parseChordSymbol('C#5')).toMatchObject({ root: 'C', type: '#5', name: 'C#5' });
    expect(parseChordSymbol('C6/E')).toEqual({ ok: true, root: 'C', type: '6', bass: 'E', name: 'C6/E' });
    expect(parseChordSymbol('C69/E')).toEqual({ ok: true, root: 'C', type: '69', bass: 'E', name: 'C69/E' });
    expect(lookupFromSymbol('C6/9').voicing).toEqual(lookupFromSymbol('C69').voicing);
    expect(lookupFromSymbol('Cadd2').voicing).toEqual(lookupFromSymbol('Cadd9').voicing);
    expect(lookupFromSymbol('F#maj7add2').voicing).toEqual(buildChordVoicing('F#', 'maj9'));
    expect(lookupFromSymbol('F#maj7add2').voicing.map((midi) => midi % 12)).toEqual([6, 10, 1, 5, 8]);

    const slash = lookupFromSymbol('G11/B');
    expect(slash).toMatchObject({ ok: true, root: 'G', type: '11', bass: 'B', name: 'G11/B' });
    expect(slash.voicing[0] % 12).toBe(NOTE_TO_PC.B);
    expect(slash.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END)).toBe(true);

    for (const symbol of ['C', 'Am7', 'Cmaj7', 'F#sus2', 'Bb7', 'Fadd9', 'C/E', 'Cm7b5']) {
      expect(lookupFromSymbol(symbol).ok, symbol).toBe(true);
    }

    const formats = supportedChordFormatList();
    for (const token of ['add2', 'maj7add2', 'maj7add9', 'm7add2', '7add2', '11', '13', 'maj11', 'maj13', 'm11', 'm13', '7#9', '7b13', '7#11', 'maj7#11', '7alt', 'alt', 'm(maj7)', 'mM7', 'mmaj7', 'minMaj7', '69', '6/9', 'add4', 'M7', 'min', 'ø', 'ø7', '°', '°7', '/bass']) {
      expect(formats, token).toContain(token);
    }
  });

  it('returns one close voicing on the keyboard, not every octave of the pitch class', () => {
    for (const symbol of ['C', 'Am7', 'Cmaj7', 'F#sus2']) {
      const found = lookupFromSymbol(symbol);
      expect(found.ok, symbol).toBe(true);
      expect(found.voicing, symbol).toEqual(buildChordVoicing(found.root, found.type));
      expect(found.voicing, symbol).toHaveLength(CHORD_FORMULAS[found.type].intervals.length);
      const samePitchClass = ALL_KEYS.filter((key) => found.voicing.some((midi) => midi % 12 === key.pc));
      expect(samePitchClass.length, symbol).toBeGreaterThan(found.voicing.length);
    }

    const high = lookupFromSymbol('Bmaj9');
    expect(high.voicing).toEqual(buildChordVoicing('B', 'maj9', 48));
    expect(high.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END)).toBe(true);
    const shown = new Set(visibleKeysForStart(high.keyboardStart).map((key) => key.midi));
    expect(high.voicing.every((midi) => shown.has(midi))).toBe(true);

    const picked = lookupFromPick('F#', 'sus2');
    expect(picked.voicing).toEqual(lookupFromSymbol('F#sus2').voicing);
    expect(picked.bass).toBeNull();
    const added = lookupFromPick('C', 'add9');
    expect(added.ok).toBe(true);
    expect(added.voicing).toEqual(buildChordVoicing('C', 'add9'));
    expect(lookupFromPick('C', 'maj7#11').ok).toBe(true);
    expect(lookupFromPick('C', 'maj7#11').voicing).toEqual(buildChordVoicing('C', 'maj7#11'));
    expect(lookupFromPick('C', 'maj7#11b13').ok).toBe(false);

    for (const symbol of ['C6', 'Cm6', 'Fadd9', 'Cmadd9', 'Cb5', 'C#5', 'C7b5', 'C7#5', 'C7sus4', 'Cm9']) {
      const found = lookupFromSymbol(symbol);
      expect(found.ok, symbol).toBe(true);
      expect(found.voicing, symbol).toEqual(buildChordVoicing(found.root, found.type));
      expect(found.voicing, symbol).toHaveLength(CHORD_FORMULAS[found.type].intervals.length);
      expect(found.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END), symbol).toBe(true);
    }
    expect(lookupFromSymbol('C#5').voicing.map((midi) => midi % 12)).toEqual(
      lookupFromSymbol('Caug').voicing.map((midi) => midi % 12),
    );
    expect(lookupFromSymbol('C#5').type).not.toBe(lookupFromSymbol('Caug').type);
  });

  it('voices slash bass as the lowest MIDI and stacks the chord above it', () => {
    const first = lookupFromSymbol('C/E');
    expect(first.voicing).toEqual([64, 67, 72]);
    expect(first.voicing[0] % 12).toBe(NOTE_TO_PC.E);
    expect(first.voicing).toHaveLength(CHORD_FORMULAS[''].intervals.length);

    const seventh = lookupFromSymbol('Am7/G');
    expect(seventh.voicing).toEqual([67, 69, 72, 76]);
    expect(seventh.voicing[0] % 12).toBe(NOTE_TO_PC.G);
    expect(seventh.voicing).toHaveLength(4);

    const outside = lookupFromSymbol('C/D');
    expect(outside.bass).toBe('D');
    expect(outside.voicing[0] % 12).toBe(NOTE_TO_PC.D);
    expect(outside.voicing.slice(1).map((midi) => midi % 12)).toEqual([0, 4, 7]);
    expect(outside.voicing[1]).toBeGreaterThan(outside.voicing[0]);
    expect(outside.voicing).toHaveLength(4);

    const add = lookupFromSymbol('Fadd9');
    expect(add.voicing).toEqual(buildChordVoicing('F', 'add9'));
    expect(add.voicing).toEqual([65, 69, 72, 79]);

    for (const symbol of ['C/E', 'Am7/G', 'C/D', 'Fadd9', 'Cadd9/E', 'Bmaj9/A#']) {
      const found = lookupFromSymbol(symbol);
      expect(found.ok, symbol).toBe(true);
      expect(found.voicing[0] % 12, symbol).toBe(NOTE_TO_PC[found.bass || found.root]);
      expect(found.voicing.every((midi) => midi >= FULL_START && midi <= FULL_END), symbol).toBe(true);
      for (let i = 1; i < found.voicing.length; i += 1) {
        expect(found.voicing[i], symbol).toBeGreaterThan(found.voicing[i - 1]);
      }
    }
    for (const symbol of ['C/E', 'Am7/G', 'C/D', 'Fadd9']) {
      const found = lookupFromSymbol(symbol);
      const shown = new Set(visibleKeysForStart(found.keyboardStart).map((key) => key.midi));
      expect(found.voicing.every((midi) => shown.has(midi)), symbol).toBe(true);
    }
  });

  it('lights only the voicing MIDI notes with Identify locked mint, not hint gold', () => {
    for (const symbol of ['C', 'F#sus2', 'Am7', 'C/E', 'Fadd9', 'Am7/G', 'F#maj7add2']) {
      const found = lookupFromSymbol(symbol);
      const highlight = lookupPianoHighlight(found.voicing);
      expect(highlight.hintNotes, symbol).toBeNull();
      expect([...highlight.pressed], symbol).toEqual(found.voicing);
      const html = renderToStaticMarkup(createElement(Keyboard, {
        pressed: highlight.pressed,
        lockedCorrect: highlight.lockedCorrect,
        wrongFlash: null,
        hintNotes: highlight.hintNotes,
        keyboardStart: found.keyboardStart,
        onKey: () => {},
        onShiftKeyboard: () => {},
      }));
      expect(markedLabels(html, 'locked').sort(), symbol).toEqual(labelsFor(found.voicing).sort());
      expect(html, symbol).not.toContain('key-hint-white');
      expect(html, symbol).not.toContain('key-hint-black');
      expect(html, symbol).not.toContain('#FFE7A8');
      expect(html, symbol).not.toContain('#C9A050');
      for (const key of ALL_KEYS.filter((item) => found.voicing.includes(item.midi))) {
        const tag = keyTag(html, `${key.name}${key.octave}`);
        if (key.isBlack) {
          expect(tag, symbol).toContain('key-locked-black');
          expect(tag, symbol).toContain('#7ADCC8');
          expect(tag, symbol).not.toContain('key-hint-black');
        } else {
          expect(tag, symbol).toContain('key-locked-white');
          expect(tag, symbol).toContain('#B8F2D8');
          expect(tag, symbol).toContain('#4FB8A0');
          expect(tag, symbol).not.toContain('key-hint-white');
        }
      }
    }
  });

  it('keeps quiz hint notes on gold when they are not a lookup lock', () => {
    const html = renderToStaticMarkup(createElement(Keyboard, {
      pressed: new Set([60]),
      lockedCorrect: new Set([0]),
      wrongFlash: null,
      hintNotes: new Set([1, 2]),
      keyboardStart: 48,
      onKey: () => {},
      onShiftKeyboard: () => {},
    }));
    const locked = keyTag(html, 'C4');
    expect(locked).toContain('key-locked-white');
    expect(locked).toContain('#B8F2D8');
    expect(locked).toContain('#4FB8A0');
    expect(locked).not.toContain('key-hint-white');
    const hintedBlack = keyTag(html, 'C#4');
    expect(hintedBlack).toContain('key-hint-black');
    expect(hintedBlack).toContain('#C9A050');
    expect(hintedBlack).not.toContain('key-locked-black');
    const hintedWhite = keyTag(html, 'D4');
    expect(hintedWhite).toContain('key-hint-white');
    expect(hintedWhite).toContain('#FFE7A8');
    expect(hintedWhite).not.toContain('key-locked-white');
    expect(hintedWhite).not.toContain('#B8F2D8');
  });

  it('renders root chips, quality chips, and one symbol field with no chord lit yet', () => {
    const html = renderToStaticMarkup(createElement(LookupMode, {
      soundOn: false,
      pianoSound: 'acoustic',
      hidden: false,
    }));
    expect(html).toContain('data-testid="lookup-panel"');
    expect(html).toContain('data-testid="lookup-symbol"');
    expect(html).toContain('data-testid="lookup-submit"');
    expect(html).toContain('>Look up<');
    expect(html).toContain('data-testid="lookup-root-F#"');
    expect(html).toContain('data-testid="lookup-quality-major"');
    expect(html).toContain('data-testid="lookup-quality-m7"');
    expect(html).toContain('data-testid="lookup-quality-sus2"');
    expect(html).toContain('data-testid="lookup-quality-maj7"');
    expect(html).toContain('data-testid="lookup-quality-6"');
    expect(html).toContain('data-testid="lookup-quality-m6"');
    expect(html).toContain('data-testid="lookup-quality-add9"');
    expect(html).toContain('data-testid="lookup-quality-madd9"');
    expect(html).toContain('data-testid="lookup-quality-b5"');
    expect(html).toContain('data-testid="lookup-quality-#5"');
    expect(html).toContain('data-testid="lookup-quality-7b5"');
    expect(html).toContain('data-testid="lookup-quality-7#5"');
    expect(html).toContain('data-testid="lookup-quality-7sus4"');
    expect(html).toContain('data-testid="lookup-quality-m9"');
    expect(html).not.toContain('data-testid="lookup-quality-11"');
    expect(html).not.toContain('data-testid="lookup-quality-7alt"');
    expect(html).not.toContain('data-testid="lookup-quality-69"');
    expect(html).not.toContain('>Dominant 11th<');
    expect(html).toContain('>Major<');
    expect(html).toContain('>Major 6th<');
    expect(html).toContain('>Add9<');
    expect(html).toContain('>Minor 9th<');
    expect(html).toContain('Pick a root and quality, or type a symbol');
    expect(html).not.toContain('lookup-error');
    expect(html).not.toContain('key-hint-white');
    expect(html).not.toContain('key-hint-black');
    expect(html).not.toContain('key-locked-white');
    expect(html).not.toContain('key-locked-black');
    expect(html).not.toContain('>Skip<');
    expect(html).not.toContain('>Perfect<');
    expect(html).not.toContain('data-testid="ear-quality-pool"');
    expect(openTag(html, 'lookup-queue-add')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-play')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-stop')).toContain('disabled');
    expect(openTag(html, 'lookup-queue-clear')).toContain('disabled');
    expect(html).toContain('data-testid="lookup-queue-list"');
    expect(html).not.toContain('data-testid="lookup-queue-item-0"');
    expect(html).toContain('>Add<');
    expect(html).toContain('>Play<');
    expect(html).toContain('>Stop<');
    expect(html).toContain('Add chords to loop them');
    expect(STRINGS.en['lookup.queuePlay']).toBe('Play');
    expect(STRINGS['zh-Hant']['lookup.queue']).toBe('循環');
    expect(STRINGS['zh-Hant']['lookup.queueAdd']).toBe('加入');
    expect(STRINGS['zh-Hant']['lookup.queueStop']).toBe('停止');
    expect(STRINGS['zh-Hant']['lookup.queueClear']).toBe('清除');
    expect(STRINGS['zh-Hant']['lookup.queueEmpty']).toBe('加入和弦後可循環播放');
    expect(STRINGS['zh-Hans']['lookup.queue']).toBe('循环');
    expect(STRINGS['zh-Hans']['lookup.queueRemove']).toBe('移除 {name}');
  });
});

describe('lookup loop queue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues resolved chords only, up to 8, and keeps a copy of the voicing', () => {
    expect(LOOKUP_LOOP_GAP_MS).toBe(1200);
    expect(LOOKUP_QUEUE_MAX).toBe(8);

    const found = lookupFromSymbol('Am7');
    const queued = chordForLookupQueue(found);
    expect(queued).toMatchObject({
      root: 'A',
      type: 'm7',
      name: 'Am7',
      keyboardStart: found.keyboardStart,
    });
    expect(queued.voicing).toEqual(found.voicing);
    expect(queued.voicing).not.toBe(found.voicing);
    expect(queued.bass).toBeNull();

    const slash = chordForLookupQueue(lookupFromSymbol('C/E'));
    expect(slash).toMatchObject({ root: 'C', type: '', bass: 'E', name: 'C/E' });
    expect(slash.voicing).toEqual(lookupFromSymbol('C/E').voicing);
    expect(slash.voicing[0] % 12).toBe(NOTE_TO_PC.E);
    expect(chordForLookupQueue(lookupFromSymbol('Cadd9')).name).toBe('Cadd9');
    expect(chordForLookupQueue(lookupFromSymbol('C6')).type).toBe('6');
    expect(chordForLookupQueue(lookupFromSymbol('Fadd9')).voicing).toEqual(lookupFromSymbol('Fadd9').voicing);
    expect(appendLookupQueue([], lookupFromSymbol('Am7/G')).map((item) => item.name)).toEqual(['Am7/G']);
    const mixed = ['C/E', 'Fadd9', 'Am7/G'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    expect(lookupLoopStep(mixed, 0).chord.voicing).toEqual(lookupFromSymbol('C/E').voicing);
    expect(lookupLoopStep(mixed, 1).chord.voicing).toEqual(buildChordVoicing('F', 'add9'));

    expect(chordForLookupQueue(lookupFromSymbol('Cmaj7#11b13'))).toBeNull();
    expect(chordForLookupQueue(lookupFromSymbol('Cmaj7add2#11'))).toBeNull();
    expect(chordForLookupQueue(lookupFromSymbol('C/E/G'))).toBeNull();
    expect(chordForLookupQueue({
      ok: true,
      root: 'C',
      type: '',
      bass: 'E',
      name: 'C/E',
      voicing: [60, 64, 67],
      keyboardStart: 48,
    })).toBeNull();
    expect(appendLookupQueue([], lookupFromSymbol('Cmaj7#11')).map((item) => item.type)).toEqual(['maj7#11']);
    expect(appendLookupQueue([], lookupFromSymbol('Cmaj7#11b13'))).toEqual([]);

    const symbols = ['C', 'Am7', 'F#sus2', 'Bb7', 'Ebdim7', 'G7b9', 'Cm7b5', 'Cmaj9'];
    let queue = [];
    for (const symbol of symbols) {
      queue = appendLookupQueue(queue, lookupFromSymbol(symbol));
    }
    expect(queue.map((item) => item.name)).toEqual(symbols);
    const blocked = appendLookupQueue(queue, lookupFromSymbol('Dm'));
    expect(blocked).toBe(queue);

    const removed = removeLookupQueueAt(queue, 1);
    expect(removed.map((item) => item.name)).toEqual(['C', 'F#sus2', 'Bb7', 'Ebdim7', 'G7b9', 'Cm7b5', 'Cmaj9']);
    expect(removeLookupQueueAt(queue, -1)).toBe(queue);
    expect(removeLookupQueueAt(queue, 99)).toBe(queue);
  });

  it('walks the queue from the start and wraps', () => {
    const queue = ['C', 'Am7', 'F#sus2'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    expect(lookupLoopStep([], 0)).toBeNull();
    const first = lookupLoopStep(queue, 0);
    const second = lookupLoopStep(queue, first.nextCursor);
    const third = lookupLoopStep(queue, second.nextCursor);
    const fourth = lookupLoopStep(queue, third.nextCursor);
    expect([first, second, third, fourth].map((step) => step.chord.name)).toEqual(['C', 'Am7', 'F#sus2', 'C']);
    expect(fourth.index).toBe(0);
  });

  it('plays each queued chord every 1200ms until stop, and drops an emptied queue', () => {
    vi.useFakeTimers();
    const queue = ['C', 'Am7', 'F#sus2'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    const shown = [];
    const played = [];
    let current = queue;
    const cleared = [];
    const stop = runLookupLoop({
      getQueue: () => current,
      onChord: (step) => { shown.push(step ? step.chord.name : null); },
      play: (chord) => { played.push(chord.name); },
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (id) => {
        cleared.push(id);
        clearTimeout(id);
      },
    });

    expect(shown).toEqual([]);
    vi.advanceTimersToNextTimer();
    expect(shown).toEqual(['C']);
    expect(played).toEqual(['C']);

    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS - 1);
    expect(played).toEqual(['C']);
    vi.advanceTimersByTime(1);
    expect(played).toEqual(['C', 'Am7']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['C', 'Am7', 'F#sus2']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['C', 'Am7', 'F#sus2', 'C']);

    current = [...queue, chordForLookupQueue(lookupFromSymbol('Bb7'))];
    const beforeAdded = played.length;
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 4);
    expect(played.slice(beforeAdded)).toContain('Bb7');

    stop();
    const playedCount = played.length;
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 4);
    expect(played).toHaveLength(playedCount);
    expect(cleared.length).toBeGreaterThan(0);

    const missed = [];
    const cancelImmediately = runLookupLoop({
      getQueue: () => queue,
      onChord: () => { missed.push('shown'); },
      play: () => { missed.push('played'); },
    });
    cancelImmediately();
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(missed).toEqual([]);

    const ended = [];
    current = queue;
    runLookupLoop({
      getQueue: () => current,
      onChord: (step) => { ended.push(step ? step.chord.name : 'end'); },
      play: () => {},
    });
    vi.advanceTimersToNextTimer();
    current = [];
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(ended).toEqual(['C', 'end']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(ended).toEqual(['C', 'end']);
  });

  it('waits one gap when chord 0 was already attacked in the tap', () => {
    vi.useFakeTimers();
    const queue = ['C', 'Am7'].map((symbol) => chordForLookupQueue(lookupFromSymbol(symbol)));
    const played = [];
    const stop = runLookupLoop({
      getQueue: () => queue,
      startCursor: 1,
      initialDelayMs: LOOKUP_LOOP_GAP_MS,
      onChord: () => {},
      play: (chord) => { played.push(chord.name); },
    });
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS - 1);
    expect(played).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(played).toEqual(['Am7']);
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS);
    expect(played).toEqual(['Am7', 'C']);
    stop();
    vi.advanceTimersByTime(LOOKUP_LOOP_GAP_MS * 3);
    expect(played).toEqual(['Am7', 'C']);
  });
});
