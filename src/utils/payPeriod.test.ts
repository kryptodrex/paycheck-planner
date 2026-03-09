import { describe, expect, it } from 'vitest';
import {
  calculateGrossPayPerPaycheck,
  convertFromDisplayMode,
  convertToDisplayMode,
  getDisplayModeLabel,
  getPaychecksPerYear,
} from './payPeriod';

describe('payPeriod utilities', () => {
  it('returns paychecks per year by frequency', () => {
    expect(getPaychecksPerYear('weekly')).toBe(52);
    expect(getPaychecksPerYear('bi-weekly')).toBe(26);
    expect(getPaychecksPerYear('semi-monthly')).toBe(24);
    expect(getPaychecksPerYear('monthly')).toBe(12);
    expect(getPaychecksPerYear('unknown')).toBe(26);
  });

  it('converts paycheck amounts to display modes', () => {
    expect(convertToDisplayMode(100, 26, 'paycheck')).toBe(100);
    expect(convertToDisplayMode(100, 26, 'monthly')).toBe(216.67);
    expect(convertToDisplayMode(100, 26, 'yearly')).toBe(2600);
  });

  it('converts display amounts back to paycheck amounts', () => {
    expect(convertFromDisplayMode(100, 26, 'paycheck')).toBe(100);
    expect(convertFromDisplayMode(216.67, 26, 'monthly')).toBeCloseTo(100, 2);
    expect(convertFromDisplayMode(2600, 26, 'yearly')).toBe(100);
  });

  it('returns display labels', () => {
    expect(getDisplayModeLabel('paycheck')).toBe('Per Paycheck');
    expect(getDisplayModeLabel('monthly')).toBe('Monthly');
    expect(getDisplayModeLabel('yearly')).toBe('Yearly');
  });

  it('calculates gross pay per paycheck for salary and hourly', () => {
    expect(
      calculateGrossPayPerPaycheck({
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      })
    ).toBe(2000);

    expect(
      calculateGrossPayPerPaycheck({
        payType: 'hourly',
        hourlyRate: 25,
        hoursPerPayPeriod: 80,
        payFrequency: 'bi-weekly',
      })
    ).toBe(2000);
  });
});
