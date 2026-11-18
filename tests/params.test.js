import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RING_PARAMS, clampParam, defaultRings, STAGES, PLAYER_LIMITS, MESSAGE_MAX } from '../src/shared/params.js';

const rules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;

describe('ring params', () => {
  it('clamps values to the declared range', () => {
    expect(clampParam('speed', 9999)).toBe(RING_PARAMS.speed.max);
    expect(clampParam('speed', -9999)).toBe(RING_PARAMS.speed.min);
    expect(clampParam('hue', 120)).toBe(120);
  });

  it('falls back to the default for non numeric input', () => {
    expect(clampParam('count', 'abc')).toBe(RING_PARAMS.count.default);
    expect(clampParam('count', null)).toBe(RING_PARAMS.count.default);
  });

  it('builds a full default state', () => {
    const d = defaultRings();
    expect(Object.keys(d).sort()).toEqual(Object.keys(RING_PARAMS).sort());
  });

  it('matches the ranges enforced by the Firebase rules', () => {
    for (const [key, p] of Object.entries(RING_PARAMS)) {
      const v = rules.rings[key]['.validate'];
      expect(v).toContain(`newData.val() >= ${p.min}`);
      expect(v).toContain(`newData.val() <= ${p.max}`);
    }
  });

  it('keeps stage names in sync with the Firebase rules', () => {
    const v = rules.stage['.validate'];
    expect(v).toContain(`/^(${STAGES.join('|')})$/`);
  });

  it('keeps player and message limits in sync with the Firebase rules', () => {
    expect(rules.players.$pid.h['.validate']).toContain(`newData.val() <= ${PLAYER_LIMITS.hueMax}`);
    expect(rules.messages.$mid.text['.validate']).toContain(`newData.val().length <= ${MESSAGE_MAX}`);
  });
});
