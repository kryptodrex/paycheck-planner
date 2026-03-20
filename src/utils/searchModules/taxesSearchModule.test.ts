import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import type { SearchActionContext } from '../searchRegistry';
import { taxesSearchModule } from './taxesSearchModule';

const createBudget = (): BudgetData => ({
  id: 'tax-test',
  name: 'Tax Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 100000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  benefits: [],
  bills: [],
  loans: [],
  savingsContributions: [],
  retirement: [],
  taxSettings: {
    taxLines: [
      { id: 'tx1', label: 'Federal', rate: 22, calculationType: 'percentage' },
      { id: 'tx2', label: 'Local', amount: 80, rate: 0, calculationType: 'fixed' },
    ],
    additionalWithholding: 25,
  },
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('taxesSearchModule', () => {
  it('builds tax line and totals results', () => {
    const results = taxesSearchModule.buildResults(createBudget());

    expect(results.find((r) => r.id === 'tax-tx1')).toBeDefined();
    expect(results.find((r) => r.id === 'tax-tx2')).toBeDefined();
    expect(results.find((r) => r.id === 'tax-total-taxes')).toBeDefined();
  });

  it('includes additional withholding result when configured', () => {
    const results = taxesSearchModule.buildResults(createBudget());
    expect(results.find((r) => r.id === 'tax-additional-withholding')).toBeDefined();
  });

  it('dispatches open-taxes-action through context', () => {
    let selectedTab = '';
    let keyUpdated = false;

    const context: SearchActionContext = {
      setTaxSearchOpenSettingsRequestKey: () => {
        keyUpdated = true;
      },
      selectTab: (tab) => {
        selectedTab = tab;
      },
    };

    const handler = taxesSearchModule.actionHandlers['open-taxes-action'];
    handler({ type: 'open-taxes-action', mode: 'open-settings' }, context);

    expect(keyUpdated).toBe(true);
    expect(selectedTab).toBe('taxes');
  });
});
