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

  it('shows the Processing IDE right after its intro', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(ids.indexOf('processing-ide')).toBe(ids.indexOf('processing') + 1);
  });

  it('shows the p5.js editor first and leaves the QR right before the first phone demo', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(ids.indexOf('p5')).toBe(ids.indexOf('p5-editor') + 1);
    expect(ids.indexOf('anells')).toBe(ids.indexOf('p5') + 1);
  });

  it('ends with the alternatives, then creative coding in the age of AI, then the closing slide', () => {
    const ids = SLIDES.map((s) => s.id);
    expect(ids.slice(-3)).toEqual(['alternatives', 'ia', 'gracies']);
  });

  it('shows the example prompt and the Claude screenshot on the AI slide', () => {
    const html = SLIDES.find((s) => s.id === 'ia').html();
    expect(html).toContain("Creative Coding en temps d'IA");
    expect(html).toContain('Crea un aplicatiu amb exemples de Creative Coding');
    expect(html).toContain('screens/claude-sketchbook.webp');
  });

  it('keeps the Matrix background only on the title slide', () => {
    expect(SLIDES.filter((s) => s.rain).map((s) => s.id)).toEqual(['titol']);
  });
});
