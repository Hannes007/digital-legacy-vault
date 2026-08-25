import { describe, expect, it } from 'vitest';
import { addMoney, formatMoney, isErr, isOk, money } from './index.js';

describe('money', () => {
  it('validates construction', () => {
    expect(money(1099, 'ZAR').amountMinor).toBe(1099);
    expect(() => money(1.5, 'ZAR')).toThrow();
    expect(() => money(100, 'zar')).toThrow();
  });
  it('adds only matching currencies', () => {
    const sum = addMoney(money(100, 'ZAR'), money(50, 'ZAR'));
    expect(isOk(sum) && sum.value.amountMinor).toBe(150);
    expect(isErr(addMoney(money(1, 'ZAR'), money(1, 'USD')))).toBe(true);
  });
  it('formats via Intl', () => {
    expect(formatMoney(money(9900, 'ZAR'), 'en-ZA')).toContain('99');
  });
});
