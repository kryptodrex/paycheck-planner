import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { preTaxDeductionsSearchModule } from './preTaxDeductionsSearchModule';

const budget: BudgetData = {
  id: 'pretax-test',
  name: 'Pre-tax Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 80000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [
    { id: 'd1', name: 'HSA', amount: 120, isPercentage: false },
    { id: 'd2', name: '401k', amount: 6, isPercentage: true },
  ],
  benefits: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  savingsContributions: [],
  loans: [],
  bills: [],
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('preTaxDeductionsSearchModule', () => {
  it('builds pre-tax deduction entries', () => {
    const results = preTaxDeductionsSearchModule.buildResults(budget);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('deduction-d1');
    expect(results.map((r) => r.id)).toContain('deduction-d2');
  });

  it('formats percentage and fixed deduction subtitles correctly', () => {
    const results = preTaxDeductionsSearchModule.buildResults(budget);

    const fixed = results.find((r) => r.id === 'deduction-d1');
    const percent = results.find((r) => r.id === 'deduction-d2');

    expect(fixed?.subtitle).toContain('per paycheck');
    expect(percent?.subtitle).toBe('6% of gross pay');
  });
});
