import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { keyMetricsSearchModule } from './keyMetricsSearchModule';

const budget: BudgetData = {
  id: 'metrics-test',
  name: 'Metrics Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 104000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
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
      amount: 1200,
      frequency: 'monthly',
      category: 'Housing',
      accountId: 'account-1',
      enabled: true,
      discretionary: false,
    },
  ],
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('keyMetricsSearchModule', () => {
  it('builds core key metrics entries', () => {
    const results = keyMetricsSearchModule.buildResults(budget);

    expect(results).toHaveLength(7);
    expect(results.map((r) => r.id)).toContain('key-metrics-total-income');
    expect(results.map((r) => r.id)).toContain('key-metrics-total-bills');
    expect(results.map((r) => r.id)).toContain('key-metrics-yearly-pay-breakdown');
  });

  it('navigates metrics cards via metrics tab anchors', () => {
    const results = keyMetricsSearchModule.buildResults(budget);
    const totalIncome = results.find((r) => r.id === 'key-metrics-total-income');

    expect(totalIncome?.action).toMatchObject({ type: 'navigate-tab', tabId: 'metrics', elementId: 'key-metrics-income-card' });
  });
});
