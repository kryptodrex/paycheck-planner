import { describe, expect, it } from 'vitest';
import {
  calculateGrossPayPerPaycheck,
  convertFromDisplayMode,
  convertToDisplayMode,
  getDisplayModeLabel,
  getPayFrequencyViewMode,
  getPaychecksPerYear,
} from './payPeriod';

describe('payPeriod utilities', () => {
  it('returns paychecks per year by frequency', () => {
    expect(getPaychecksPerYear('weekly')).toBe(52);
    expect(getPaychecksPerYear('bi-weekly')).toBe(26);
    expect(getPaychecksPerYear('semi-monthly')).toBe(24);
    expect(getPaychecksPerYear('monthly')).toBe(12);
    expect(getPaychecksPerYear('quarterly')).toBe(4);
    expect(getPaychecksPerYear('yearly')).toBe(1);
    expect(getPaychecksPerYear('unknown')).toBe(26);
  });

  it('converts paycheck amounts to display modes', () => {
    expect(convertToDisplayMode(100, 26, 'paycheck')).toBe(100);
    expect(convertToDisplayMode(100, 26, 'weekly')).toBe(50);
    expect(convertToDisplayMode(100, 26, 'bi-weekly')).toBe(100);
    expect(convertToDisplayMode(100, 26, 'semi-monthly')).toBe(108.33);
    expect(convertToDisplayMode(100, 26, 'monthly')).toBe(216.67);
    expect(convertToDisplayMode(100, 26, 'quarterly')).toBe(650);
    expect(convertToDisplayMode(100, 26, 'yearly')).toBe(2600);
  });

  it('converts display amounts back to paycheck amounts', () => {
    expect(convertFromDisplayMode(100, 26, 'paycheck')).toBe(100);
    expect(convertFromDisplayMode(50, 26, 'weekly')).toBe(100);
    expect(convertFromDisplayMode(100, 26, 'bi-weekly')).toBe(100);
    expect(convertFromDisplayMode(108.33, 26, 'semi-monthly')).toBeCloseTo(100, 2);
    expect(convertFromDisplayMode(216.67, 26, 'monthly')).toBeCloseTo(100, 2);
    expect(convertFromDisplayMode(650, 26, 'quarterly')).toBe(100);
    expect(convertFromDisplayMode(2600, 26, 'yearly')).toBe(100);
  });

  it('round-trips display-mode edits without losing the entered monthly value', () => {
    const storedAmount = convertFromDisplayMode(185.55, 26, 'monthly');

    expect(storedAmount).toBe(85.638461538462);
    expect(convertToDisplayMode(storedAmount, 26, 'monthly')).toBe(185.55);
  });

  it('round-trips display-mode edits without losing the entered yearly value', () => {
    const storedAmount = convertFromDisplayMode(1234.56, 26, 'yearly');

    expect(storedAmount).toBe(47.483076923077);
    expect(convertToDisplayMode(storedAmount, 26, 'yearly')).toBe(1234.56);
  });

  it('returns display labels', () => {
    expect(getDisplayModeLabel('paycheck')).toBe('Per Paycheck');
    expect(getDisplayModeLabel('weekly')).toBe('Weekly');
    expect(getDisplayModeLabel('bi-weekly')).toBe('Bi-weekly');
    expect(getDisplayModeLabel('semi-monthly')).toBe('Semi-monthly');
    expect(getDisplayModeLabel('monthly')).toBe('Monthly');
    expect(getDisplayModeLabel('quarterly')).toBe('Quarterly');
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

  it('maps pay frequency to cadence-matching view mode', () => {
    expect(getPayFrequencyViewMode('weekly')).toBe('weekly');
    expect(getPayFrequencyViewMode('bi-weekly')).toBe('bi-weekly');
    expect(getPayFrequencyViewMode('semi-monthly')).toBe('semi-monthly');
    expect(getPayFrequencyViewMode('monthly')).toBe('monthly');
    expect(getPayFrequencyViewMode('quarterly')).toBe('quarterly');
    expect(getPayFrequencyViewMode('yearly')).toBe('yearly');
    expect(getPayFrequencyViewMode('unknown')).toBe('bi-weekly');
  });
});
