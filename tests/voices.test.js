import { describe, it, expect } from 'vitest';
import { impactVolume, createVoiceGate } from '../src/shared/voices.js';

describe('impact volume', () => {
  it('is audible even for a light touch', () => {
    expect(impactVolume(0.6)).toBeGreaterThan(0.1);
  });

  it('grows with the strength of the crash', () => {
    expect(impactVolume(8)).toBeGreaterThan(impactVolume(2));
  });

  it('never goes above full volume, however hard the dash', () => {
    expect(impactVolume(50)).toBe(1);
  });

  it('treats a missing strength as a light touch', () => {
    expect(impactVolume(undefined)).toBe(impactVolume(0));
  });
});

describe('voice gate (keeps 30 phones from turning into noise)', () => {
  it('lets sounds through up to the limit', () => {
    const gate = createVoiceGate({ max: 3, window: 100 });
    expect([gate.allow(0), gate.allow(10), gate.allow(20)]).toEqual([true, true, true]);
  });

  it('drops the extra sounds inside the same window', () => {
    const gate = createVoiceGate({ max: 3, window: 100 });
    gate.allow(0); gate.allow(10); gate.allow(20);
    expect(gate.allow(30)).toBe(false);
  });

  it('frees a slot once the oldest sound leaves the window', () => {
    const gate = createVoiceGate({ max: 3, window: 100 });
    gate.allow(0); gate.allow(10); gate.allow(20);
    expect(gate.allow(101)).toBe(true);
    expect(gate.allow(105)).toBe(false);
  });
});
