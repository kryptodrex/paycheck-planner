import { describe, expect, it } from 'vitest';
import { getBillFrequencyOccurrencesPerYear, getPayFrequencyOccurrencesPerYear } from './frequency';
import {
  calculateGrossPayPerPaycheck,
  calculateGrossPayPerYear,
  convertToDisplayMode,
  getPaychecksPerYear,
} from './payPeriod';
import { calculateTaxLineAmount } from './taxLines';
import { sumAndRound } from './money';

describe('golden financial scenarios', () => {
  it('keeps a stable baseline payroll and withholding scenario', () => {
    const paychecksPerYear = getPaychecksPerYear('bi-weekly');
    const grossPerPaycheck = calculateGrossPayPerPaycheck({
      payType: 'salary',
      annualSalary: 78000,
      payFrequency: 'bi-weekly',
    });

    const taxableIncomeAfterPreTaxDeductions = 2500;

    const federalWithholding = calculateTaxLineAmount(
      taxableIncomeAfterPreTaxDeductions,
      { id: 'federal', label: 'Federal Withholding', rate: 12, calculationType: 'percentage' },
      grossPerPaycheck,
    );
    const socialSecurity = calculateTaxLineAmount(
      taxableIncomeAfterPreTaxDeductions,
      { id: 'ss', label: 'Social Security', rate: 6.2, calculationType: 'percentage' },
      grossPerPaycheck,
    );
    const medicare = calculateTaxLineAmount(
      taxableIncomeAfterPreTaxDeductions,
      { id: 'med', label: 'Medicare', rate: 1.45, calculationType: 'percentage' },
      grossPerPaycheck,
    );
    const fixedLocalTax = calculateTaxLineAmount(
      taxableIncomeAfterPreTaxDeductions,
      { id: 'local', label: 'Local Tax', rate: 0, amount: 40, calculationType: 'fixed' },
      grossPerPaycheck,
    );

    const totalWithholding = sumAndRound(federalWithholding, socialSecurity, medicare, fixedLocalTax);
    const netPerPaycheck = grossPerPaycheck - totalWithholding;
    const monthlyGross = convertToDisplayMode(grossPerPaycheck, paychecksPerYear, 'monthly');

    expect(paychecksPerYear).toBe(26);
    expect(grossPerPaycheck).toBe(3000);
    expect(calculateGrossPayPerYear({ payType: 'salary', annualSalary: 78000, payFrequency: 'bi-weekly' })).toBe(78000);

    expect(federalWithholding).toBe(300);
    expect(socialSecurity).toBe(186);
    expect(medicare).toBe(43.5);
    expect(fixedLocalTax).toBe(40);
    expect(totalWithholding).toBe(569.5);

    expect(netPerPaycheck).toBe(2430.5);
    expect(monthlyGross).toBe(6500);
  });

  it('preserves canonical occurrence counts for pay and custom bill frequencies', () => {
    expect(getPayFrequencyOccurrencesPerYear('semi-monthly')).toBe(24);
    expect(getBillFrequencyOccurrencesPerYear('custom', 10)).toBe(36.5);
    expect(getBillFrequencyOccurrencesPerYear('semi-annual')).toBe(2);
  });
});
