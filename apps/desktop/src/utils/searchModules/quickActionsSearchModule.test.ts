import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { quickActionsSearchModule } from './quickActionsSearchModule';

const budget: BudgetData = {
  id: 'quick-actions-test',
  name: 'Quick Actions Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 82000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
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

describe('quickActionsSearchModule', () => {
  it('builds expected quick action entries', () => {
    const results = quickActionsSearchModule.buildResults(budget);

    expect(results).toHaveLength(6);
    expect(results.map((r) => r.id)).toContain('quick-action-add-bill');
    expect(results.map((r) => r.id)).toContain('quick-action-add-loan-payment');
    expect(results.map((r) => r.id)).toContain('quick-action-edit-tax-settings');
  });

  it('maps actions to correct action types', () => {
    const results = quickActionsSearchModule.buildResults(budget);

    expect(results.find((r) => r.id === 'quick-action-add-bill')?.action).toMatchObject({ type: 'open-bills-action', mode: 'add-bill' });
    expect(results.find((r) => r.id === 'quick-action-add-loan-payment')?.action).toMatchObject({ type: 'open-loans-action', mode: 'add-loan' });
    expect(results.find((r) => r.id === 'quick-action-edit-tax-settings')?.action).toMatchObject({ type: 'open-taxes-action', mode: 'open-settings' });
  });
});
