import { describe, it, expect } from 'vitest';

import {
  formatCurrencyAED,
  formatDate,
  formatPercent,
  formatRelative,
  validateEmail,
  validatePassword,
} from '@/utils/formatters';

describe('validatePassword', () => {
  it('rejects less than 8 characters', () => {
    expect(validatePassword('Ab1')).toEqual({ valid: false, reason: 'tooShort' });
  });

  it('rejects when uppercase is missing', () => {
    expect(validatePassword('lowercase1')).toEqual({ valid: false, reason: 'weak' });
  });

  it('rejects when digit is missing', () => {
    expect(validatePassword('NoDigitsAtAll')).toEqual({ valid: false, reason: 'weak' });
  });

  it('accepts a valid password', () => {
    expect(validatePassword('Password9')).toEqual({ valid: true });
  });
});

describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('reviewer@vertex.ae')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(validateEmail('reviewer.vertex.ae')).toBe(false);
  });

  it('rejects missing tld', () => {
    expect(validateEmail('reviewer@vertex')).toBe(false);
  });

  it('rejects whitespace', () => {
    expect(validateEmail('rev iewer@vertex.ae')).toBe(false);
  });
});

describe('formatCurrencyAED', () => {
  it('renders integer AED with no decimals', () => {
    const s = formatCurrencyAED(1234, 'en');
    expect(s).toMatch(/AED\s?1,234/);
  });
});

describe('formatPercent', () => {
  it('renders 12 as 12%', () => {
    const s = formatPercent(12, 'en');
    expect(s).toMatch(/12/);
    expect(s).toContain('%');
  });
});

describe('formatDate', () => {
  it('produces a non-empty medium-style date', () => {
    const s = formatDate('2026-05-17', 'en');
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('2026');
  });
});

describe('formatRelative', () => {
  it('formats a moment in the recent past', () => {
    const dt = new Date(Date.now() - 60_000);
    const s = formatRelative(dt, 'en');
    // Locale prints "1 minute ago" or "1 min. ago"; both include "1".
    expect(s).toContain('1');
  });
});
