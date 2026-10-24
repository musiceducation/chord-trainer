import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Keyboard } from '../components/Keyboard.jsx';
import { LookupMode } from '../components/LookupMode.jsx';
import { buildChordVoicing } from '../lib/chords.js';
import {
  lookupFromPick,
  lookupFromSymbol,
  parseChordSymbol,
  supportedChordFormatList,
} from '../lib/chordLookup.js';
import { ALL_KEYS, CHORD_FORMULAS, FULL_END, FULL_START } from '../lib/constants.js';
import { visibleKeysForStart } from '../lib/keyboardRange.js';

function hintedLabels(html) {
  return [...html.matchAll(/aria-label="([^"]+)"(?=[^>]*key-hint-(?:white|black))/g)].map((match) => match[1]);
}

function labelsFor(midis) {
  return ALL_KEYS.filter((key) => midis.includes(key.midi)).map((key) => `${key.name}${key.octave}`);
}

describe('chord symbol lookup', () => {
  it('parses symbols that map onto CHORD_FORMULAS', () => {
    expect(parseChordSymbol('F#sus2')).toEqual({ ok: true, root: 'F#', type: 'sus2', name: 'F#sus2' });
    expect(parseChordSymbol('Am7')).toEqual({ ok: true, root: 'A', type: 'm7', name: 'Am7' });
    expect(parseChordSymbol('am7')).toEqual({ ok: true, root: 'A', type: 'm7', name: 'Am7' });
    expect(parseChordSymbol('Cmaj7')).toEqual({ ok: true, root: 'C', type: 'maj7', name: 'Cmaj7' });
    expect(parseChordSymbol('C')).toEqual({ ok: true, root: 'C', type: '', name: 'C' });
    expect(parseChordSymbol('Bb7')).toEqual({ ok: true, root: 'Bb', type: '7', name: 'Bb7' });
    expect(parseChordSymbol('Ebdim7')).toEqual({ ok: true, root: 'Eb', type: 'dim7', name: 'Ebdim7' });
    expect(parseChordSymbol('G7b9')).toEqual({ ok: true, root: 'G', type: '7b9', name: 'G7b9' });
    expect(parseChordSymbol('Cm7b5')).toEqual({ ok: true, root: 'C', type: 'm7b5', name: 'Cm7b5' });
    expect(parseChordSymbol('  Cmaj9  ')).toEqual({ ok: true, root: 'C', type: 'maj9', name: 'Cmaj9' });
    expect(parseChordSymbol('Dbmaj7')).toMatchObject({ root: 'Db', type: 'maj7' });
  });

  it('rejects add9, slash chords, inversions, and other unsupported spellings', () => {
    const unsupported = [
      '',
      '   ',
      'Cadd9',
      'C9add',
      'C/E',
      'Am7/G',
      'Cmaj7/B',
      'Cmin',
      'C+',
      'C6',
      'H7',
      'C sus2',
      'CMaj7',
      'CM7',
    ];
    for (const symbol of unsupported) {
      const parsed = parseChordSymbol(symbol);
      expect(parsed.ok, symbol).toBe(false);
      const looked = lookupFromSymbol(symbol);
      expect(looked.ok, symbol).toBe(false);
      expect(looked.voicing, symbol).toBeUndefined();
    }
  });

  it('lists every formula and does not advertise out-of-scope spellings', () => {
    expect(supportedChordFormatList().split(', ')).toEqual(
      Object.keys(CHORD_FORMULAS).map((type) => type || 'major'),
    );
    expect(supportedChordFormatList()).not.toMatch(/add9|slash|inversion|\//i);
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
    expect(lookupFromPick('C', 'add9').ok).toBe(false);
  });

  it('highlights only the voicing MIDI notes on the shared keyboard', () => {
    for (const symbol of ['C', 'F#sus2', 'Am7']) {
      const found = lookupFromSymbol(symbol);
      const html = renderToStaticMarkup(createElement(Keyboard, {
        pressed: new Set(),
        lockedCorrect: new Set(),
        wrongFlash: null,
        hintNotes: new Set(found.voicing),
        keyboardStart: found.keyboardStart,
        onKey: () => {},
        onShiftKeyboard: () => {},
      }));
      expect(hintedLabels(html).sort(), symbol).toEqual(labelsFor(found.voicing).sort());
      expect(html).not.toContain('key-locked-white');
      expect(html).not.toContain('key-locked-black');
    }
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
    expect(html).toContain('>Major<');
    expect(html).toContain('Pick a root and quality, or type a symbol');
    expect(html).not.toContain('lookup-error');
    expect(html).not.toContain('key-hint-white');
    expect(html).not.toContain('key-hint-black');
    expect(html).not.toContain('>Skip<');
    expect(html).not.toContain('>Perfect<');
    expect(html).not.toContain('data-testid="ear-quality-pool"');
  });
});
