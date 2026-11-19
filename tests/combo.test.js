import { describe, it, expect } from 'vitest';
import { COMBO_START, comboStep } from '../src/shared/combo.js';

const type = (keys, { gap = 100, word = 'gta' } = {}) => {
  let s = COMBO_START, now = 1000;
  const steps = [];
  for (const k of keys) { s = comboStep(s, k, now, word); steps.push(s); now += gap; }
  return steps;
};

describe('key combo', () => {
  it('fires when the word is typed in order', () => {
    const steps = type(['g', 't', 'a']);
    expect(steps.map((s) => s.done)).toEqual([false, false, true]);
  });

  it('shows the progress in capitals, whatever the case typed', () => {
    expect(type(['g', 'T']).map((s) => s.shown)).toEqual(['G', 'GT']);
    expect(type(['g', 't', 'a']).at(-1).shown).toBe('GTA');
  });

  it('claims the keys that continue the combo, so the deck does not act on them', () => {
    expect(type(['g', 't', 'a']).every((s) => s.consumed)).toBe(true);
  });

  it('lets a key outside the combo through, so its usual shortcut still works', () => {
    const [t] = type(['t']);
    expect(t.consumed).toBe(false);
    expect(t.shown).toBe('');
  });

  it('starts over after a wrong key', () => {
    const steps = type(['g', 'x', 't', 'a']);
    expect(steps.map((s) => s.done)).toEqual([false, false, false, false]);
    expect(steps[1].shown).toBe('');
  });

  it('restarts from the first letter if it comes again mid-combo', () => {
    const steps = type(['g', 'g', 't', 'a']);
    expect(steps.at(-1).done).toBe(true);
  });

  it('forgets a half-typed combo after a pause', () => {
    const steps = type(['g', 't', 'a'], { gap: 3500 });
    expect(steps.at(-1).done).toBe(false);
    expect(steps[1].consumed).toBe(false); // the lonely t goes back to being the theme key
  });

  it('can fire again after completing', () => {
    const steps = type(['g', 't', 'a', 'g', 't', 'a']);
    expect(steps.filter((s) => s.done)).toHaveLength(2);
  });
});

describe('typed slowly on stage', () => {
  it('waits a couple of seconds between letters for dramatic effect', () => {
    expect(type(['g', 't', 'a'], { gap: 2500 }).at(-1).done).toBe(true);
  });
});
