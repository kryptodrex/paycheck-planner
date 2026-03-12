import { describe, expect, it } from 'vitest';
import {
  getBillFrequencyOccurrencesPerYear,
  getPayFrequencyOccurrencesPerYear,
  getSavingsFrequencyOccurrencesPerYear,
  normalizeFrequencyToken,
} from './frequency';

describe('frequency utilities', () => {
  it('normalizes case, spacing, and dash variants', () => {
    expect(normalizeFrequencyToken(' Bi Weekly ')).toBe('bi-weekly');
    expect(normalizeFrequencyToken('SEMI_MONTHLY')).toBe('semi-monthly');
    expect(normalizeFrequencyToken('bi\u2011weekly')).toBe('bi-weekly'); // non-breaking hyphen
  });

  it('returns pay frequency occurrences including aliases', () => {
    expect(getPayFrequencyOccurrencesPerYear('weekly')).toBe(52);
    expect(getPayFrequencyOccurrencesPerYear('bi-weekly')).toBe(26);
    expect(getPayFrequencyOccurrencesPerYear('biweekly')).toBe(26);
    expect(getPayFrequencyOccurrencesPerYear('semi-monthly')).toBe(24);
    expect(getPayFrequencyOccurrencesPerYear('twice a month')).toBe(24);
    expect(getPayFrequencyOccurrencesPerYear('monthly')).toBe(12);
    expect(getPayFrequencyOccurrencesPerYear('unknown')).toBe(26);
  });

  it('returns bill frequency occurrences with custom fallback behavior', () => {
    expect(getBillFrequencyOccurrencesPerYear('quarterly')).toBe(4);
    expect(getBillFrequencyOccurrencesPerYear('semiannual')).toBe(2);
    expect(getBillFrequencyOccurrencesPerYear('annually')).toBe(1);
    expect(getBillFrequencyOccurrencesPerYear('custom', 10)).toBe(36.5);
    expect(getBillFrequencyOccurrencesPerYear('custom')).toBe(1);
    expect(getBillFrequencyOccurrencesPerYear('unknown')).toBe(1);
  });

  it('returns savings frequency occurrences including annual aliases', () => {
    expect(getSavingsFrequencyOccurrencesPerYear('weekly')).toBe(52);
    expect(getSavingsFrequencyOccurrencesPerYear('biweekly')).toBe(26);
    expect(getSavingsFrequencyOccurrencesPerYear('semi-annual')).toBe(2);
    expect(getSavingsFrequencyOccurrencesPerYear('annual')).toBe(1);
    expect(getSavingsFrequencyOccurrencesPerYear('unknown')).toBe(12);
  });
});
