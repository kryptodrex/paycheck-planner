import { describe, expect, it } from 'vitest';

import {
  calculateOtherIncomeAnnualAmount,
  calculateOtherIncomePerPaycheckAmount,
  calculateOtherIncomePerPaycheckTotals,
  getOtherIncomeOccurrencesPerYear,
  getOtherIncomeScheduledOccurrencesPerYear,
} from './otherIncome';
import { roundToCent } from './money';

describe('otherIncome', () => {
  it('resolves supported other income frequencies to annual occurrences', () => {
    expect(getOtherIncomeOccurrencesPerYear('monthly')).toBe(12);
    expect(getOtherIncomeOccurrencesPerYear('quarterly')).toBe(4);
    expect(getOtherIncomeOccurrencesPerYear('yearly')).toBe(1);
  });

  it('annualizes fixed and percent-of-gross other income correctly', () => {
    expect(calculateOtherIncomeAnnualAmount({
      id: 'fixed',
      name: 'Rental Income',
      incomeType: 'rental-income',
      amountMode: 'fixed',
      amount: 500,
      frequency: 'monthly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 2000, 26)).toBe(6000);

    expect(calculateOtherIncomeAnnualAmount({
      id: 'percent',
      name: 'Bonus',
      incomeType: 'bonus',
      amountMode: 'percent-of-gross',
      amount: 0,
      percentOfGross: 10,
      frequency: 'quarterly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    }, 2000, 26)).toBe(5200);
  });

  it('converts annualized other income into stable per-paycheck averages', () => {
    expect(calculateOtherIncomePerPaycheckAmount({
      id: 'annual-bonus',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 5200,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    }, 2000, 26)).toBe(200);
  });

  it('aggregates gross, taxable-only, and net-only amounts separately', () => {
    const totals = calculateOtherIncomePerPaycheckTotals([
      {
        id: 'gross-income',
        name: 'Monthly Commission',
        incomeType: 'commission',
        amountMode: 'fixed',
        amount: 260,
        frequency: 'monthly',
        isTaxable: true,
        payTreatment: 'gross',
        withholdingMode: 'auto',
      },
      {
        id: 'taxable-income',
        name: 'Supplemental Taxable',
        incomeType: 'other',
        amountMode: 'fixed',
        amount: 130,
        frequency: 'monthly',
        isTaxable: true,
        payTreatment: 'taxable',
        withholdingMode: 'manual',
      },
      {
        id: 'net-income',
        name: 'Reimbursement',
        incomeType: 'reimbursement',
        amountMode: 'fixed',
        amount: 52,
        frequency: 'monthly',
        isTaxable: false,
        payTreatment: 'net',
        withholdingMode: 'none',
      },
    ], 2000, 26);

    expect(totals).toEqual({
      gross: 120,
      taxable: 60,
      net: 24,
    });
  });

  it('keeps yearly totals exact when converting through per-paycheck amounts', () => {
    const paychecksPerYear = 26;

    const annualBonus = calculateOtherIncomeAnnualAmount({
      id: 'bonus-10pct',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'percent-of-gross',
      amount: 0,
      percentOfGross: 10,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    }, 90000 / paychecksPerYear, paychecksPerYear);

    const bonusPerPaycheck = calculateOtherIncomePerPaycheckAmount({
      id: 'bonus-10pct',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'percent-of-gross',
      amount: 0,
      percentOfGross: 10,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    }, 90000 / paychecksPerYear, paychecksPerYear);

    expect(roundToCent(annualBonus)).toBe(9000);
    expect(roundToCent(bonusPerPaycheck * paychecksPerYear)).toBe(9000);

    const annualRental = calculateOtherIncomeAnnualAmount({
      id: 'rental-monthly',
      name: 'Rental Income',
      incomeType: 'rental-income',
      amountMode: 'fixed',
      amount: 1500,
      frequency: 'monthly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 0, paychecksPerYear);

    const rentalPerPaycheck = calculateOtherIncomePerPaycheckAmount({
      id: 'rental-monthly',
      name: 'Rental Income',
      incomeType: 'rental-income',
      amountMode: 'fixed',
      amount: 1500,
      frequency: 'monthly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 0, paychecksPerYear);

    expect(roundToCent(annualRental)).toBe(18000);
    expect(roundToCent(rentalPerPaycheck * paychecksPerYear)).toBe(18000);
  });

  it('always averages annualized income across paychecks', () => {
    const perPaycheck = calculateOtherIncomePerPaycheckAmount({
      id: 'bonus-yearly',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 9000,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 90000 / 26, 26);

    expect(roundToCent(perPaycheck)).toBe(roundToCent(9000 / 26));
  });

  it('ignores active months when resolving scheduled annual occurrences', () => {
    expect(getOtherIncomeScheduledOccurrencesPerYear({
      id: 'monthly-limited',
      name: 'Seasonal Consulting',
      incomeType: 'personal-business',
      amountMode: 'fixed',
      amount: 1000,
      frequency: 'monthly',
      activeMonths: [1, 4, 7, 10],
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    })).toBe(12);

    expect(getOtherIncomeScheduledOccurrencesPerYear({
      id: 'quarterly-limited',
      name: 'Quarterly Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 2000,
      frequency: 'quarterly',
      activeMonths: [3, 9],
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    })).toBe(4);

    expect(getOtherIncomeScheduledOccurrencesPerYear({
      id: 'weekly-ignored',
      name: 'Weekly Side Work',
      incomeType: 'personal-business',
      amountMode: 'fixed',
      amount: 200,
      frequency: 'weekly',
      activeMonths: [1, 2],
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    })).toBe(52);
  });

  it('does not apply active-month scaling to annualized amounts', () => {
    const fixedAnnual = calculateOtherIncomeAnnualAmount({
      id: 'fixed-active-months',
      name: 'Seasonal Rental',
      incomeType: 'rental-income',
      amountMode: 'fixed',
      amount: 1200,
      frequency: 'monthly',
      activeMonths: [5, 6, 7],
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 2000, 26);

    expect(fixedAnnual).toBe(14400);

    const percentAnnual = calculateOtherIncomeAnnualAmount({
      id: 'percent-active-months',
      name: 'Seasonal Bonus',
      incomeType: 'bonus',
      amountMode: 'percent-of-gross',
      amount: 0,
      percentOfGross: 12,
      frequency: 'quarterly',
      activeMonths: [3, 9],
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 2000, 26);

    expect(percentAnnual).toBe(6240);
  });
});