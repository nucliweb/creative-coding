import { describe, it, expect } from 'vitest';
import { nextTheme, stepTextScale, TEXT_SCALE } from '../src/shared/display.js';

describe('theme', () => {
  it('toggles between dark and light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });

  it('falls back to light from an unknown value', () => {
    expect(nextTheme(undefined)).toBe('light');
  });
});

describe('text scale', () => {
  it('grows and shrinks in steps', () => {
    expect(stepTextScale(1, 1)).toBeCloseTo(1 + TEXT_SCALE.step);
    expect(stepTextScale(1, -1)).toBeCloseTo(1 - TEXT_SCALE.step);
  });

  it('stays within limits', () => {
    expect(stepTextScale(TEXT_SCALE.max, 1)).toBe(TEXT_SCALE.max);
    expect(stepTextScale(TEXT_SCALE.min, -1)).toBe(TEXT_SCALE.min);
  });

  it('recovers from invalid stored values', () => {
    expect(stepTextScale(Number.NaN, 0)).toBe(1);
  });
});
