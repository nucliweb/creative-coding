import { describe, it, expect } from 'vitest';
import { BLAST, blastEnvelope, gathered, chargeTarget, nextCharge, blastKick, nextReady, CLIMAX_START, climaxKey } from '../src/shared/blast.js';

describe('blast envelope', () => {
  it('is calm when nothing has exploded', () => {
    expect(blastEnvelope(null)).toEqual({ attract: 1, vmax: BLAST.vmaxCalm });
  });

  it('cuts the attraction right after the blast so particles fly free', () => {
    const e = blastEnvelope(0);
    expect(e.attract).toBe(0);
    expect(e.vmax).toBeGreaterThan(BLAST.vmaxCalm);
  });

  it('brings the swarms back gradually, never jumping', () => {
    const samples = [];
    for (let t = 0; t <= BLAST.recover + 0.5; t += 0.05) samples.push(blastEnvelope(t).attract);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
      expect(samples[i] - samples[i - 1]).toBeLessThan(0.1);
    }
    expect(samples.at(-1)).toBe(1);
  });

  it('is fully calm again once recovered', () => {
    expect(blastEnvelope(BLAST.recover)).toEqual({ attract: 1, vmax: BLAST.vmaxCalm });
  });
});

describe('gathering at the centre', () => {
  const target = { x: 0.5, y: 0.5, r: 0.2, aspect: 16 / 9 };
  const at = (id, x, y, extra = {}) => ({ id, x, y, ...extra });

  it('counts audience attractors inside the target', () => {
    const list = [at('a', 0.5, 0.5), at('b', 0.52, 0.45), at('c', 0.9, 0.1)];
    expect(gathered(list, target)).toEqual({ inside: 2, total: 3 });
  });

  it('measures distance in screen proportions, not raw 0..1 coordinates', () => {
    // 0.15 of the width on a 16:9 screen is ~0.27 of the height: outside a 0.2 radius
    expect(gathered([at('a', 0.65, 0.5)], target)).toEqual({ inside: 0, total: 1 });
    expect(gathered([at('a', 0.5, 0.65)], target)).toEqual({ inside: 1, total: 1 });
  });

  it('ignores ghosts and the presenter mouse', () => {
    const list = [at('ghost0', 0.5, 0.5, { ghost: true }), at('mouse', 0.5, 0.5)];
    expect(gathered(list, target)).toEqual({ inside: 0, total: 0 });
  });
});

describe('charging the core', () => {
  const settle = (from, target, seconds) => { let c = from; for (let t = 0; t < seconds; t += 1 / 60) c = nextCharge(c, target, 1 / 60); return c; };

  it('aims at full charge once enough people are inside', () => {
    expect(chargeTarget({ inside: 0, total: 20 })).toBe(0);
    expect(chargeTarget({ inside: 7, total: 20 })).toBeCloseTo(0.5);
    expect(chargeTarget({ inside: 14, total: 20 })).toBe(1);
    expect(chargeTarget({ inside: 20, total: 20 })).toBe(1);
    expect(chargeTarget({ inside: 0, total: 0 })).toBe(0);
  });

  it('builds up over a couple of seconds, not instantly', () => {
    expect(settle(0, 1, 0.5)).toBeLessThan(0.5);
    expect(settle(0, 1, 3)).toBeGreaterThan(0.95);
  });

  it('drains faster than it builds, so leaving the centre is felt', () => {
    expect(1 - settle(1, 0, 0.5)).toBeGreaterThan(settle(0, 1, 0.5));
  });

  it('makes a bigger bang the more charged the core is', () => {
    expect(blastKick(1)).toBeGreaterThan(blastKick(0.3));
    expect(blastKick(0)).toBeGreaterThan(0);
  });
});

describe('ready moment', () => {
  it('turns ready once the core is fully charged', () => {
    expect(nextReady(false, 0.9)).toBe(false);
    expect(nextReady(false, 0.96)).toBe(true);
  });

  it('stays ready through small wobbles, so the win sound does not repeat', () => {
    expect(nextReady(true, 0.9)).toBe(true);
    expect(nextReady(true, 0.7)).toBe(false);
  });
});

describe('climax keys', () => {
  const charged = { ...CLIMAX_START, gathering: true, charge: 1, ready: true };

  it('g toggles the call to the centre', () => {
    expect(climaxKey(CLIMAX_START, 'g', 0).gathering).toBe(true);
    expect(climaxKey(charged, 'g', 0).gathering).toBe(false);
  });

  it('x explodes: ends the round and starts the blast clock', () => {
    const s = climaxKey(charged, 'x', 5000);
    expect(s).toMatchObject({ gathering: false, charge: 0, ready: false, blastAt: 5000 });
  });

  it('r starts a new round after the blast, ready to win again', () => {
    const blown = climaxKey(charged, 'x', 5000);
    const s = climaxKey(blown, 'r', 6000);
    expect(s).toMatchObject({ gathering: true, charge: 0, ready: false });
  });

  it('r keeps the blast recovery running so the swarms do not jump', () => {
    const blown = climaxKey(charged, 'x', 5000);
    expect(climaxKey(blown, 'r', 6000).blastAt).toBe(5000);
  });

  it('ignores other keys', () => {
    expect(climaxKey(charged, 's', 0)).toBeNull();
  });
});
