import { describe, it, expect } from 'vitest';
import { next, prev, goTo, parseHash, toHash } from '../src/deck/navigation.js';

const slides = [{ id: 'a', steps: 0 }, { id: 'b', steps: 2 }, { id: 'c', steps: 0 }];

describe('deck navigation', () => {
  it('advances through steps before moving to the next slide', () => {
    let s = { index: 1, step: 0 };
    s = next(slides, s); expect(s).toEqual({ index: 1, step: 1 });
    s = next(slides, s); expect(s).toEqual({ index: 1, step: 2 });
    s = next(slides, s); expect(s).toEqual({ index: 2, step: 0 });
  });

  it('stays on the last slide', () => {
    expect(next(slides, { index: 2, step: 0 })).toEqual({ index: 2, step: 0 });
  });

  it('goes back to the previous slide fully revealed', () => {
    expect(prev(slides, { index: 2, step: 0 })).toEqual({ index: 1, step: 2 });
    expect(prev(slides, { index: 1, step: 2 })).toEqual({ index: 1, step: 1 });
    expect(prev(slides, { index: 0, step: 0 })).toEqual({ index: 0, step: 0 });
  });

  it('clamps direct jumps', () => {
    expect(goTo(slides, 99)).toEqual({ index: 2, step: 0 });
    expect(goTo(slides, -3)).toEqual({ index: 0, step: 0 });
  });

  it('round-trips through the URL hash', () => {
    const h = toHash(slides, { index: 1, step: 2 });
    expect(h).toBe('#/b/2');
    expect(parseHash(slides, h)).toEqual({ index: 1, step: 2 });
  });

  it('ignores unknown hashes', () => {
    expect(parseHash(slides, '#/zzz/1')).toEqual({ index: 0, step: 0 });
    expect(parseHash(slides, '')).toEqual({ index: 0, step: 0 });
  });
});
