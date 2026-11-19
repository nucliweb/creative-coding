import { describe, it, expect } from 'vitest';
import { remoteKey } from '../src/shared/remoteKeys.js';

const key = (k, mods = {}) => ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...mods });

describe('keys the presenter view forwards to the deck', () => {
  it('forwards demo keys so the climax and the arena can be run from the presenter', () => {
    for (const k of ['g', 'x', 'r', 'b', 'p', 'c', 'w', '1', 't', 'm']) expect(remoteKey(key(k))).toEqual({ key: k, shiftKey: false });
  });

  it('forwards Tab, which pauses the arena', () => {
    expect(remoteKey(key('Tab'))).toEqual({ key: 'Tab', shiftKey: false });
  });

  it('forwards symbols typed with Shift, such as > for bigger text', () => {
    expect(remoteKey(key('>', { shiftKey: true }))).toEqual({ key: '>', shiftKey: true });
  });

  it('keeps navigation and the timer in the presenter, which already handles them', () => {
    for (const k of ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'i']) expect(remoteKey(key(k))).toBeNull();
  });

  it('does not forward shortcuts that only make sense in the deck window', () => {
    expect(remoteKey(key('P', { shiftKey: true }))).toBeNull(); // open presenter
    expect(remoteKey(key('F', { shiftKey: true }))).toBeNull(); // fullscreen needs a click in the deck itself
  });

  it('leaves browser and system shortcuts alone', () => {
    expect(remoteKey(key('r', { metaKey: true }))).toBeNull();
    expect(remoteKey(key('t', { ctrlKey: true }))).toBeNull();
    expect(remoteKey(key('x', { altKey: true }))).toBeNull();
  });

  it('ignores lone modifier and special keys', () => {
    for (const k of ['Shift', 'Escape', 'Enter', 'Meta']) expect(remoteKey(key(k))).toBeNull();
  });
});
