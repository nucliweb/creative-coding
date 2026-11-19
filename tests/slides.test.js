import { describe, it, expect } from 'vitest';

// slides.js imports demo modules lazily, so it can be loaded in Node.
const { SLIDES } = await import('../src/deck/slides.js');

describe('talk plan', () => {
  it('fits in a 20 minute slot', () => {
    const total = SLIDES.reduce((t, s) => t + (s.minutes || 0), 0);
    expect(total).toBeGreaterThanOrEqual(19.5);
    expect(total).toBeLessThanOrEqual(20);
  });

  it('has unique slide ids', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows the Processing IDE and the p5.js editor right after their intros', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(ids.indexOf('processing-ide')).toBe(ids.indexOf('processing') + 1);
    expect(ids.indexOf('p5-editor')).toBe(ids.indexOf('p5') + 1);
  });

  it('presents the alternatives just before the closing slide', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(ids.indexOf('alternatives')).toBe(ids.indexOf('gracies') - 1);
  });

  it('keeps the Matrix background only on the title slide', () => {
    expect(SLIDES.filter((s) => s.rain).map((s) => s.id)).toEqual(['titol']);
  });
});
