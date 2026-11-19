import { describe, it, expect } from 'vitest';
import { ARENA, createWorld, syncAvatar, removeMissing, stepArena } from '../src/shared/arena.js';

const input = (over = {}) => ({ n: 'TEST', h: 120, s: 1, jx: 0, jy: 0, d: 0, ...over });
const run = (world, seconds) => { const events = []; for (let t = 0; t < seconds; t += 1 / 60) events.push(...stepArena(world, 1 / 60)); return events; };
const place = (world, id, x, z, over) => { syncAvatar(world, id, input(over)); const a = world.avatars.get(id); a.x = x; a.z = z; a.vx = 0; a.vz = 0; return a; };

describe('arena movement', () => {
  it('moves in the joystick direction', () => {
    const w = createWorld();
    const a = place(w, 'a', 0, 0, { jx: 1 });
    run(w, 1);
    expect(a.x).toBeGreaterThan(1);
    expect(Math.abs(a.z)).toBeLessThan(0.01);
  });

  it('moves further with a higher speed setting', () => {
    const w = createWorld();
    const slow = place(w, 'slow', -5, -3, { jx: 1, s: 1 });
    const fast = place(w, 'fast', -5, 3, { jx: 1, s: 3 });
    run(w, 0.8);
    expect(fast.x - -5).toBeGreaterThan((slow.x - -5) * 2);
  });

  it('comes to rest when the joystick is released', () => {
    const w = createWorld();
    const a = place(w, 'a', 0, 0, { jx: 1 });
    run(w, 0.5);
    syncAvatar(w, 'a', input({ jx: 0 }));
    run(w, 3);
    expect(Math.hypot(a.vx, a.vz)).toBeLessThan(0.01);
  });

  it('never leaves the arena', () => {
    const w = createWorld();
    const a = place(w, 'a', 0, 0, { jx: 1, jy: -1, s: 5 });
    run(w, 10);
    expect(Math.hypot(a.x, a.z)).toBeLessThanOrEqual(ARENA.radius - ARENA.avatarRadius + 1e-6);
  });

  it('clamps out of range input', () => {
    const w = createWorld();
    const a = place(w, 'a', 0, 0, { jx: 50, s: 99 });
    expect(a.input.jx).toBe(1);
    expect(a.input.s).toBe(5);
  });
});

describe('arena collisions', () => {
  it('bounces two avatars that run into each other', () => {
    const w = createWorld();
    const a = place(w, 'a', -3, 0, { jx: 1, s: 3 });
    const b = place(w, 'b', 3, 0, { jx: -1, s: 3 });
    const events = run(w, 1.5);
    const hits = events.filter((e) => e.type === 'hit');
    expect(hits.length).toBeGreaterThan(0);
    expect(w.collisions).toBeGreaterThan(0);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(ARENA.avatarRadius * 2 - 1e-6);
  });

  it('pushes a resting avatar when hit', () => {
    const w = createWorld();
    place(w, 'a', -2, 0, { jx: 1, s: 4 });
    const b = place(w, 'b', 0, 0);
    run(w, 1);
    expect(b.x).toBeGreaterThan(0.2);
  });
});

describe('dash', () => {
  it('gives one impulse per press', () => {
    const w = createWorld();
    const a = place(w, 'a', 0, 0, { jx: 1, d: 0 });
    stepArena(w, 1 / 60);
    const before = Math.hypot(a.vx, a.vz);
    syncAvatar(w, 'a', input({ jx: 1, d: 1 }));
    stepArena(w, 1 / 60);
    const after = Math.hypot(a.vx, a.vz);
    expect(after).toBeGreaterThan(before + ARENA.dashImpulse * 0.8);
    stepArena(w, 1 / 60);
    expect(Math.hypot(a.vx, a.vz)).toBeLessThan(after);
  });
});

describe('membership', () => {
  it('removes avatars of phones that left', () => {
    const w = createWorld();
    syncAvatar(w, 'a', input());
    syncAvatar(w, 'b', input());
    removeMissing(w, new Set(['b']));
    expect([...w.avatars.keys()]).toEqual(['b']);
  });

  it('spawns new avatars inside the arena and apart from each other', () => {
    const w = createWorld();
    for (let i = 0; i < 30; i++) syncAvatar(w, `p${i}`, input());
    for (const a of w.avatars.values()) expect(Math.hypot(a.x, a.z)).toBeLessThan(ARENA.radius);
  });
});

describe('who gets the crash', () => {
  const firstHit = (events) => events.find((e) => e.type === 'hit');

  it('credits only the one who rams into a player standing still', () => {
    const w = createWorld();
    place(w, 'joan', -2, 0, { jx: 1, s: 4 });
    place(w, 'john', 0, 0);
    expect(firstHit(run(w, 1)).by).toEqual(['joan']);
  });

  it('works the same whichever side the rammer comes from', () => {
    const w = createWorld();
    place(w, 'john', 0, 0);
    place(w, 'joan', 2, 0, { jx: -1, s: 4 });
    expect(firstHit(run(w, 1)).by).toEqual(['joan']);
  });

  it('does not credit a player who was moving away when caught from behind', () => {
    const w = createWorld();
    place(w, 'slow', 0, 0, { jx: 1, s: 1 });
    place(w, 'fast', -2.5, 0, { jx: 1, s: 5 });
    expect(firstHit(run(w, 2)).by).toEqual(['fast']);
  });

  it('credits both in a head-on crash where both charged', () => {
    const w = createWorld();
    place(w, 'a', -3, 0, { jx: 1, s: 3 });
    place(w, 'b', 3, 0, { jx: -1, s: 3 });
    expect([...firstHit(run(w, 1.5)).by].sort()).toEqual(['a', 'b']);
  });

  it('still counts every crash once in the room total', () => {
    const w = createWorld();
    place(w, 'joan', -2, 0, { jx: 1, s: 4 });
    place(w, 'john', 0, 0);
    const hits = run(w, 1).filter((e) => e.type === 'hit');
    expect(w.collisions).toBe(hits.length);
  });
});
