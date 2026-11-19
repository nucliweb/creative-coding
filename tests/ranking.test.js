import { describe, it, expect } from 'vitest';
import { ranking, scorePatch } from '../src/shared/ranking.js';

const p = (name, hits, hue = 0) => ({ name, hits, hue });

describe('crash ranking', () => {
  it('puts the most crashes first', () => {
    const r = ranking([p('ANA', 3), p('BOB', 9), p('CAT', 5)]);
    expect(r.map((e) => e.name)).toEqual(['BOB', 'CAT', 'ANA']);
    expect(r.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('gives tied players the same position, and skips the next one', () => {
    const r = ranking([p('ANA', 5), p('BOB', 9), p('CAT', 5), p('DAN', 1)]);
    expect(r.map((e) => [e.name, e.rank])).toEqual([['BOB', 1], ['ANA', 2], ['CAT', 2], ['DAN', 4]]);
  });

  it('orders ties by name, so the list does not jump around between pauses', () => {
    const r = ranking([p('ZOE', 4), p('ANA', 4)]);
    expect(r.map((e) => e.name)).toEqual(['ANA', 'ZOE']);
  });

  it('keeps players with no crashes, at the bottom', () => {
    const r = ranking([p('ANA', 0), p('BOB', 2)]);
    expect(r.map((e) => [e.name, e.hits])).toEqual([['BOB', 2], ['ANA', 0]]);
  });

  it('shows only the top of a full room', () => {
    const many = Array.from({ length: 30 }, (_, i) => p(`P${String(i).padStart(2, '0')}`, i));
    const r = ranking(many, 10);
    expect(r).toHaveLength(10);
    expect(r[0]).toMatchObject({ name: 'P29', hits: 29, rank: 1 });
  });

  it('carries each player colour through', () => {
    expect(ranking([p('ANA', 1, 210)])[0].hue).toBe(210);
  });
});

describe('scores sent to the phones', () => {
  const rows = (list) => ranking(list.map(([id, hits]) => ({ id, name: id.toUpperCase(), hits, hue: 0 })));

  it('carries the player id through the ranking', () => {
    expect(rows([['a1', 3]])[0].id).toBe('a1');
  });

  it('sends every player the first time: crashes, position and room size', () => {
    const { patch } = scorePatch({}, rows([['a', 5], ['b', 2]]));
    expect(patch).toEqual({ a: { h: 5, r: 1, n: 2 }, b: { h: 2, r: 2, n: 2 } });
  });

  it('sends nothing when nothing changed', () => {
    const first = scorePatch({}, rows([['a', 5], ['b', 2]]));
    expect(scorePatch(first.sent, rows([['a', 5], ['b', 2]])).patch).toEqual({});
  });

  it('sends only the players whose score or position changed', () => {
    const first = scorePatch({}, rows([['a', 5], ['b', 2], ['c', 0]]));
    const { patch } = scorePatch(first.sent, rows([['a', 5], ['b', 6], ['c', 0]]));
    expect(patch).toEqual({ b: { h: 6, r: 1, n: 3 }, a: { h: 5, r: 2, n: 3 } });
  });

  it('clears the score of a player who left', () => {
    const first = scorePatch({}, rows([['a', 5], ['b', 2]]));
    expect(scorePatch(first.sent, rows([['a', 5]])).patch).toEqual({ a: { h: 5, r: 1, n: 1 }, b: null });
  });

  it('ignores the bots: they have no phone to tell', () => {
    const { patch } = scorePatch({}, rows([['a', 1], ['bot-0', 9]]), (id) => !id.startsWith('bot-'));
    expect(Object.keys(patch)).toEqual(['a']);
  });
});
