import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { payBreakdownSearchModule } from './payBreakdownSearchModule';

const baseBudget: BudgetData = {
  id: 'breakdown-test',
  name: 'Breakdown Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 98000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [{ id: 'd1', name: 'HSA', amount: 100, isPercentage: false }],
  benefits: [],
  retirement: [],
  taxSettings: {
    taxLines: [{ id: 'tx1', label: 'Federal', rate: 20, calculationType: 'percentage' }],
    additionalWithholding: 0,
  },
  savingsContributions: [],
  loans: [],
  bills: [
    {
      id: 'bill1',
      name: 'Rent',
      amount: 1500,
      frequency: 'monthly',
      category: 'Housing',
      accountId: 'account-1',
      enabled: true,
      discretionary: false,
    },
  ],
  accounts: [{ id: 'account-1', name: 'Checking', type: 'checking', allocation: 0, color: '#4B5563' }],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('payBreakdownSearchModule', () => {
  it('builds baseline pay breakdown entries', () => {
    const results = payBreakdownSearchModule.buildResults(baseBudget);

    expect(results.map((r) => r.id)).toContain('pay-breakdown-gross-pay');
    expect(results.map((r) => r.id)).toContain('pay-breakdown-net-pay');
    expect(results.map((r) => r.id)).toContain('pay-breakdown-remaining-for-spending');
  });

  it('includes conditional entries when data is present', () => {
    const results = payBreakdownSearchModule.buildResults(baseBudget);

    expect(results.map((r) => r.id)).toContain('pay-breakdown-pre-tax-deductions');
    expect(results.map((r) => r.id)).toContain('pay-breakdown-after-tax-allocations');
  });
});
