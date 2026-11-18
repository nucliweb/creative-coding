import { describe, it, expect } from 'vitest';
import { stepEnergy, smoothLevel } from '../src/shared/energy.js';

describe('applause energy', () => {
  it('grows while the room is loud', () => {
    let e = 0;
    for (let i = 0; i < 60; i++) e = stepEnergy(e, 0.8, 1 / 60);
    expect(e).toBeGreaterThan(0.1);
  });

  it('decays during silence', () => {
    const e = stepEnergy(0.5, 0, 1);
    expect(e).toBeLessThan(0.5);
    expect(e).toBeGreaterThanOrEqual(0);
  });

  it('ignores background noise below the threshold', () => {
    let e = 0;
    for (let i = 0; i < 600; i++) e = stepEnergy(e, 0.4, 1 / 60);
    expect(e).toBe(0);
  });

  it('never exceeds 1', () => {
    let e = 0.99;
    for (let i = 0; i < 600; i++) e = stepEnergy(e, 1, 1 / 60);
    expect(e).toBe(1);
  });

  it('takes several seconds of sustained applause to fill', () => {
    let e = 0, t = 0;
    while (e < 1 && t < 60) { e = stepEnergy(e, 0.7, 1 / 60); t += 1 / 60; }
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(20);
  });
});

describe('smoothLevel', () => {
  it('rises fast and falls slowly', () => {
    expect(smoothLevel(0, 1)).toBeGreaterThan(0.5);
    expect(smoothLevel(1, 0)).toBeGreaterThan(0.8);
  });
});

import { levelFromRms } from '../src/shared/energy.js';

describe('levelFromRms (dB scale)', () => {
  it('maps silence to 0', () => {
    expect(levelFromRms(0, 4)).toBe(0);
    expect(levelFromRms(0.001, 4)).toBe(0);
  });

  it('maps a distant applause (low RMS) to a clearly visible level', () => {
    expect(levelFromRms(0.03, 4)).toBeGreaterThan(0.5);
  });

  it('saturates at 1 for very loud input', () => {
    expect(levelFromRms(1, 4)).toBe(1);
  });

  it('is monotonic and responds to sensitivity', () => {
    expect(levelFromRms(0.02, 4)).toBeGreaterThan(levelFromRms(0.01, 4));
    expect(levelFromRms(0.01, 8)).toBeGreaterThan(levelFromRms(0.01, 4));
  });
});
