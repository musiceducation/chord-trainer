import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pressPianoKey } from '../lib/keyTrigger.js';

/** Events WKWebView emits for one finger tap when touch and mouse listeners both exist. */
const IOS_TAP = ['pointerdown', 'touchstart', 'pointerup', 'touchend', 'mousedown', 'mouseup', 'click'];

function dispatch(type, play, { button = 0 } = {}) {
  const event = {
    type,
    button: type.startsWith('touch') ? undefined : button,
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
  const started = pressPianoKey(event, play);
  return { started, prevented: event.prevented };
}

describe('pressPianoKey', () => {
  it('attacks once on press and ignores the lift, including the iOS ghost click', () => {
    const played = [];
    const prevented = [];
    for (const type of IOS_TAP) {
      const result = dispatch(type, () => played.push(60));
      if (result.prevented) prevented.push(type);
    }
    expect(played).toEqual([60]);
    expect(prevented).toEqual(['pointerdown']);
  });

  it('does not attack on pointerup, touchend, or click by themselves', () => {
    const played = [];
    for (const type of ['pointerup', 'touchend', 'touchstart', 'mouseup', 'mousedown', 'click']) {
      expect(dispatch(type, () => played.push(type)).started).toBe(false);
    }
    expect(played).toEqual([]);
  });

  it('attacks again only on another pointerdown', () => {
    const played = [];
    dispatch('pointerdown', () => played.push(1));
    dispatch('pointerup', () => played.push(2));
    dispatch('click', () => played.push(3));
    dispatch('pointerdown', () => played.push(4));
    expect(played).toEqual([1, 4]);
  });

  it('ignores a non-primary button', () => {
    const played = [];
    expect(dispatch('pointerdown', () => played.push(60), { button: 2 }).started).toBe(false);
    expect(played).toEqual([]);
  });

  it('wires both white and black keys through pointerdown only', () => {
    const source = fs.readFileSync(path.resolve('src/components/Keyboard.jsx'), 'utf8');
    expect(source.match(/onPointerDown=\{playKey\(/g)).toHaveLength(2);
    expect(source).not.toMatch(/onMouseDown|onTouchStart|onTouchEnd|onPointerUp|onMouseUp/);
  });
});
