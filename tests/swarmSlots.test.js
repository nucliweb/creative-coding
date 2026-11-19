import { describe, it, expect } from 'vitest';
import { assignSlots, ownerIndices, NO_OWNER } from '../src/shared/swarmSlots.js';

const empty = (n) => new Array(n).fill(null);
const countOf = (table) => table.reduce((m, id) => (id === null ? m : m.set(id, (m.get(id) || 0) + 1)), new Map());
const moved = (a, b) => a.filter((id, i) => id !== null && id !== b[i]).length;

describe('swarm slot assignment', () => {
  it('leaves every slot free when nobody is connected', () => {
    expect(assignSlots(empty(12), [])).toEqual(empty(12));
  });

  it('gives a single player every slot', () => {
    expect(assignSlots(empty(6), ['a'])).toEqual(['a', 'a', 'a', 'a', 'a', 'a']);
  });

  it('splits slots evenly, never differing by more than one', () => {
    const table = assignSlots(empty(240), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const counts = [...countOf(table).values()];
    expect(counts).toHaveLength(7);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(table.every((id) => id !== null)).toBe(true);
  });

  it('keeps existing owners in place when someone joins', () => {
    const before = assignSlots(empty(240), ['a', 'b', 'c']);
    const after = assignSlots(before, ['a', 'b', 'c', 'd']);
    // 'd' needs 60 slots; only those change hands
    expect(countOf(after).get('d')).toBe(60);
    expect(moved(before, after)).toBe(60);
  });

  it('hands a leaving player\'s slots to the others without touching theirs', () => {
    const before = assignSlots(empty(240), ['a', 'b', 'c', 'd']);
    const after = assignSlots(before, ['a', 'b', 'c']);
    expect(countOf(after)).toEqual(new Map([['a', 80], ['b', 80], ['c', 80]]));
    before.forEach((id, i) => { if (id !== 'd') expect(after[i]).toBe(id); });
  });

  it('caps at one slot per player when there are more players than slots', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const table = assignSlots(empty(4), ids);
    expect(new Set(table).size).toBe(4);
    expect(table.every((id) => id !== null)).toBe(true);
  });

  it('does not mutate the previous table', () => {
    const prev = empty(8);
    assignSlots(prev, ['a']);
    expect(prev).toEqual(empty(8));
  });
});

describe('slot owners as attractor indices', () => {
  it('maps each slot to the index of its owner in this frame\'s attractor list', () => {
    const list = [{ id: 'b' }, { id: 'a' }];
    expect([...ownerIndices(['a', 'b', null, 'a'], list)]).toEqual([1, 0, NO_OWNER, 1]);
  });

  it('marks slots whose owner is not in the list as unowned', () => {
    expect([...ownerIndices(['gone'], [{ id: 'a' }])]).toEqual([NO_OWNER]);
  });
});
