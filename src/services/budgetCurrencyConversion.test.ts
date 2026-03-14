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
    taxLines: [{ id: 'tax-1', label: 'Federal', rate: 0.22 }],
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
});