import { describe, it, expect } from 'vitest';
import { sanitizeMessage, isBlocked, sanitizeName } from '../src/shared/sanitize.js';

describe('sanitizeMessage', () => {
  it('trims, collapses spaces and uppercases', () => {
    expect(sanitizeMessage('  hola   món ')).toBe('HOLA MÓN');
  });

  it('keeps Catalan characters', () => {
    expect(sanitizeMessage('tomàquet l·l ç')).toBe('TOMÀQUET L·L Ç');
  });

  it('removes control characters and markup', () => {
    expect(sanitizeMessage('<b>hey</b>\u0007')).toBe('BHEY/B');
  });

  it('cuts to the maximum length', () => {
    expect(sanitizeMessage('x'.repeat(50)).length).toBe(20);
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeMessage('   ')).toBe('');
    expect(sanitizeMessage(undefined)).toBe('');
  });
});

describe('isBlocked', () => {
  it('blocks offensive words even with separators or leetspeak', () => {
    expect(isBlocked('FUCK')).toBe(true);
    expect(isBlocked('P.U.T.A')).toBe(true);
    expect(isBlocked('M3RDA')).toBe(true);
  });

  it('allows normal words', () => {
    expect(isBlocked('HOLA GIROTRÒNICA')).toBe(false);
    expect(isBlocked('COMPUTADORA')).toBe(false);
  });
});

describe('sanitizeName', () => {
  it('uppercases and cuts to 12 characters', () => {
    expect(sanitizeName('  joan león del sud ')).toBe('JOAN LEÓN DE');
  });

  it('rejects offensive names', () => {
    expect(sanitizeName('m3rda')).toBe('');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName(null)).toBe('');
  });
});
