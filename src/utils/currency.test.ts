import { describe, expect, it } from 'vitest';
import { CURRENCIES, formatCurrency, formatWithSymbol, getCurrencySymbol } from './currency';

describe('currency utilities', () => {
  it('includes USD in supported currencies', () => {
    const usd = CURRENCIES.find((currency) => currency.code === 'USD');
    expect(usd).toBeDefined();
    expect(usd?.symbol).toBe('$');
  });

  it('resolves symbols and falls back to code when unknown', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });

  it('formats currency using Intl for valid codes', () => {
    expect(formatCurrency(1234.56, 'USD', 'en-US')).toBe('$1,234.56');
  });

  it('falls back to symbol + localized number when Intl currency code is invalid', () => {
    expect(formatCurrency(1234.56, 'INVALID', 'en-US')).toContain('INVALID1,234.56');
  });

  it('formats with symbol and guards against NaN', () => {
    expect(formatWithSymbol(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatWithSymbol(Number.NaN, 'USD')).toBe('$0');
  });
});
