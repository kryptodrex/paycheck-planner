import { describe, expect, it } from 'vitest';
import { convertBillToMonthly, convertBillToYearly, formatBillFrequency } from './billFrequency';

describe('billFrequency utilities', () => {
  it('converts frequencies to yearly totals', () => {
    expect(convertBillToYearly(100, 'weekly')).toBe(5200);
    expect(convertBillToYearly(100, 'bi-weekly')).toBe(2600);
    expect(convertBillToYearly(100, 'monthly')).toBe(1200);
    expect(convertBillToYearly(100, 'quarterly')).toBe(400);
    expect(convertBillToYearly(100, 'semi-annual')).toBe(200);
    expect(convertBillToYearly(100, 'yearly')).toBe(100);
    expect(convertBillToYearly(100, 'custom')).toBe(1200);
  });

  it('converts frequencies to monthly amounts', () => {
    expect(convertBillToMonthly(100, 'monthly')).toBe(100);
    expect(convertBillToMonthly(100, 'custom')).toBe(100);
    expect(convertBillToMonthly(100, 'yearly')).toBeCloseTo(8.34, 2);
  });

  it('formats bill frequency labels', () => {
    expect(formatBillFrequency('bi-weekly')).toBe('Bi-weekly');
    expect(formatBillFrequency('semi-annual')).toBe('Semi-annual');
    expect(formatBillFrequency('monthly')).toBe('Monthly');
  });
});
