import { describe, expect, it } from 'vitest';

import type { BudgetData } from '../types/budget';
import { convertBudgetAmounts, roundCurrency } from './budgetCurrencyConversion';

const sampleBudget: BudgetData = {
  id: 'budget-1',
  name: 'Test Budget',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 50000,
    hourlyRate: 25.555,
    payFrequency: 'bi-weekly',
    minLeftover: 123.456,
  },
  preTaxDeductions: [
    { id: 'deduction-fixed', name: 'Transit', amount: 100, isPercentage: false },
    { id: 'deduction-percent', name: 'Percent', amount: 5, isPercentage: true },
  ],
  benefits: [
    { id: 'benefit-fixed', name: 'Insurance', amount: 50, isTaxable: false, isPercentage: false },
    { id: 'benefit-percent', name: 'Benefit Percent', amount: 2, isTaxable: true, isPercentage: true },
  ],
  retirement: [
    {
      id: 'retirement-fixed',
      type: '401k',
      employeeContribution: 200,
      employeeContributionIsPercentage: false,
      hasEmployerMatch: true,
      employerMatchCap: 100,
      employerMatchCapIsPercentage: false,
      yearlyLimit: 23000,
    },
    {
      id: 'retirement-percent',
      type: '403b',
      employeeContribution: 6,
      employeeContributionIsPercentage: true,
      hasEmployerMatch: true,
      employerMatchCap: 4,
      employerMatchCapIsPercentage: true,
      yearlyLimit: undefined,
    },
  ],
  taxSettings: {
    taxLines: [
      { id: 'tax-1', label: 'Federal', rate: 22, amount: 0, calculationType: 'percentage' },
      { id: 'tax-2', label: 'Local', rate: 0, amount: 40, calculationType: 'fixed' },
    ],
    additionalWithholding: 10.125,
  },
  accounts: [
    {
      id: 'account-1',
      name: 'Checking',
      type: 'checking',
      color: '#000000',
      allocation: 400,
      allocationCategories: [{ id: 'cat-1', name: 'Bills', amount: 150 }],
    },
  ],
  bills: [
    { id: 'bill-1', name: 'Rent', amount: 1200, frequency: 'monthly', accountId: 'account-1' },
  ],
  loans: [
    {
      id: 'loan-1',
      name: 'Car Loan',
      type: 'auto',
      principal: 10000,
      currentBalance: 8750.4,
      interestRate: 4.9,
      propertyTaxRate: 1.1,
      propertyValue: 220000,
      monthlyPayment: 310.33,
      accountId: 'account-1',
      startDate: '2026-01-01T00:00:00.000Z',
      insurancePayment: 45.22,
      insuranceEndBalance: 900,
      insuranceEndBalancePercent: 78,
      paymentBreakdown: [
        { id: 'line-1', label: 'Principal & Interest', amount: 250.25, frequency: 'monthly' },
      ],
    },
  ],
  savingsContributions: [
    { id: 'savings-1', name: 'Emergency Fund', amount: 75, frequency: 'monthly', accountId: 'account-1', type: 'savings' },
  ],
  settings: {
    currency: 'USD',
    locale: 'en-US',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('budgetCurrencyConversion', () => {
  it('rounds currency values to two decimal places', () => {
    expect(roundCurrency(12.345)).toBe(12.35);
    expect(roundCurrency(12.344)).toBe(12.34);
  });

  it('converts major budget amount fields while preserving percentage-based values', () => {
    const converted = convertBudgetAmounts(sampleBudget, 1.5);

    expect(converted.paySettings.annualSalary).toBe(75000);
    expect(converted.paySettings.hourlyRate).toBe(38.33);
    expect(converted.paySettings.minLeftover).toBe(185.18);

    expect(converted.preTaxDeductions[0].amount).toBe(150);
    expect(converted.preTaxDeductions[1].amount).toBe(5);

    expect(converted.benefits[0].amount).toBe(75);
    expect(converted.benefits[1].amount).toBe(2);

    expect(converted.retirement[0].employeeContribution).toBe(300);
    expect(converted.retirement[0].employerMatchCap).toBe(150);
    expect(converted.retirement[0].yearlyLimit).toBe(34500);
    expect(converted.retirement[1].employeeContribution).toBe(6);
    expect(converted.retirement[1].employerMatchCap).toBe(4);

    expect(converted.taxSettings.taxLines[0].amount).toBe(0);
    expect(converted.taxSettings.taxLines[1].amount).toBe(60);
    expect(converted.taxSettings.additionalWithholding).toBe(15.19);
    expect(converted.accounts[0].allocation).toBe(600);
    expect(converted.accounts[0].allocationCategories?.[0].amount).toBe(225);
    expect(converted.bills[0].amount).toBe(1800);
    expect(converted.savingsContributions?.[0].amount).toBe(112.5);
  });

  it('converts loan money fields without touching rate and percentage fields', () => {
    const converted = convertBudgetAmounts(sampleBudget, 0.8);
    const loan = converted.loans[0];

    expect(loan.principal).toBe(8000);
    expect(loan.currentBalance).toBe(7000.32);
    expect(loan.monthlyPayment).toBe(248.26);
    expect(loan.propertyValue).toBe(176000);
    expect(loan.insurancePayment).toBe(36.18);
    expect(loan.insuranceEndBalance).toBe(720);
    expect(loan.paymentBreakdown?.[0].amount).toBe(200.2);

    expect(loan.interestRate).toBe(4.9);
    expect(loan.propertyTaxRate).toBe(1.1);
    expect(loan.insuranceEndBalancePercent).toBe(78);
  });

  describe('Round-trip conversion accuracy', () => {
    it('USD → EUR → USD: $65,000 salary round-trip with realistic rates', () => {
      // Real exchange rate at time of test: 1 USD = ~0.92 EUR
      const usdToEurRate = 0.92;
      const eurToUsdRate = 1 / usdToEurRate; // 1.0869565...

      const budget = { ...sampleBudget, paySettings: { ...sampleBudget.paySettings, annualSalary: 65000 } };

      // First conversion: USD → EUR
      const inEur = convertBudgetAmounts(budget, usdToEurRate);
      expect(inEur.paySettings.annualSalary).toBe(59800);

      // Second conversion: EUR → USD (using inverse rate)
      const backToUsd = convertBudgetAmounts(inEur, eurToUsdRate);
      expect(backToUsd.paySettings.annualSalary).toBe(65000);

      // Verify loss is zero with inverse rate calculation
      const precisionLoss = Math.abs(65000 - (backToUsd.paySettings.annualSalary || 0));
      expect(precisionLoss).toBe(0);
    });

    it('USD → JPY → USD: $65,000 salary round-trip with realistic rates', () => {
      // Real exchange rate: 1 USD = ~149.50 JPY (as of early 2026)
      const usdToJpyRate = 149.5;
      const jpyToUsdRate = 1 / usdToJpyRate; // 0.00669113...

      const budget = { ...sampleBudget, paySettings: { ...sampleBudget.paySettings, annualSalary: 65000 } };

      // First conversion: USD → JPY
      const inJpy = convertBudgetAmounts(budget, usdToJpyRate);
      expect(inJpy.paySettings.annualSalary).toBe(9717500);

      // Second conversion: JPY → USD (using inverse rate)
      const backToUsd = convertBudgetAmounts(inJpy, jpyToUsdRate);
      expect(backToUsd.paySettings.annualSalary).toBe(65000);

      // Verify loss is zero with inverse rate calculation
      const precisionLoss = Math.abs(65000 - (backToUsd.paySettings.annualSalary || 0));
      expect(precisionLoss).toBe(0);
    });

    it('USD → GBP → USD: round-trip maintains precision', () => {
      // 1 USD = ~0.79 GBP
      const usdToGbpRate = 0.79;
      const gbpToUsdRate = 1 / usdToGbpRate; // 1.26582...

      const budget = { ...sampleBudget, paySettings: { ...sampleBudget.paySettings, annualSalary: 65000 } };

      const inGbp = convertBudgetAmounts(budget, usdToGbpRate);
      expect(inGbp.paySettings.annualSalary).toBe(51350);

      const backToUsd = convertBudgetAmounts(inGbp, gbpToUsdRate);
      // Precise inverse calculation maintains full precision even with mid-precision rates
      expect(backToUsd.paySettings.annualSalary).toBe(65000);

      // Verify loss < $1 (acceptable for display purposes)
      const precisionLoss = Math.abs(65000 - (backToUsd.paySettings.annualSalary || 0));
      expect(precisionLoss).toBeLessThan(1);
    });

    it('Multiple field round-trip: deductions, retirement, bills maintain precision', () => {
      const rate = 0.92; // USD to EUR
      const inverseRate = 1 / rate;

      const forwardPass = convertBudgetAmounts(sampleBudget, rate);
      const backwardPass = convertBudgetAmounts(forwardPass, inverseRate);

      // Check multiple fields round-trip
      expect(backwardPass.paySettings.annualSalary).toBe(50000);
      expect(backwardPass.preTaxDeductions[0].amount).toBe(100);
      expect(backwardPass.retirement[0].employeeContribution).toBe(200);
      expect(backwardPass.bills[0].amount).toBe(1200);
      expect(backwardPass.loans[0].principal).toBe(10000);
    });

    it('Precision degradation with manual inverse vs automatic: 8-decimal vs 2-decimal', () => {
      // When user manually calculates inverse and enters fewer decimals
      const rate = 0.849577; // USD to EUR (6 decimals)
      const manualInverse = 1.177; // User manually calculates and rounds to 3 decimals
      const preciseInverse = 1 / rate; // 1.17707... (full precision)

      const budget = { ...sampleBudget, paySettings: { ...sampleBudget.paySettings, annualSalary: 65000 } };

      // Forward conversion
      const forward = convertBudgetAmounts(budget, rate);
      expect(forward.paySettings.annualSalary).toBe(55222.51);

      // Backward with manual inverse (loses precision due to rounded inverse)
      const manualBack = convertBudgetAmounts(forward, manualInverse);
      expect(manualBack.paySettings.annualSalary).toBe(64996.89); // Loses ~$3.11

      // Backward with precise inverse (maintains precision)
      const preciseBack = convertBudgetAmounts(forward, preciseInverse);
      // Precise inverse maintains accuracy to within a penny (floating point rounding)
      expect(preciseBack.paySettings.annualSalary).toBeCloseTo(65000, 0);

      // Manual inverse shows loss of ~$3.11 due to rounding the inverse
      const manualLoss = Math.abs(65000 - (manualBack.paySettings.annualSalary || 0));
      expect(manualLoss).toBeGreaterThan(3);

      // Precise inverse maintains accuracy to the penny
      const preciseLoss = Math.abs(65000 - (preciseBack.paySettings.annualSalary || 0));
      expect(preciseLoss).toBeLessThan(0.02); // Allow for floating point rounding
    });
  });
});