import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import type { SearchActionContext } from '../searchRegistry';
import { savingsSearchModule } from './savingsSearchModule';

const createBudget = (): BudgetData => ({
  id: 'savings-test',
  name: 'Savings Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 95000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  benefits: [],
  bills: [],
  loans: [],
  savingsContributions: [
    {
      id: 'sav1',
      name: 'Emergency Fund',
      amount: 300,
      frequency: 'monthly',
      type: 'savings',
      accountId: 'account-1',
      enabled: true,
    },
    {
      id: 'sav2',
      name: 'Brokerage',
      amount: 200,
      frequency: 'monthly',
      type: 'investment',
      accountId: 'account-1',
      enabled: false,
    },
  ],
  retirement: [
    {
      id: 'ret1',
      type: '401k',
      customLabel: 'Main 401k',
      employeeContribution: 6,
      employeeContributionIsPercentage: true,
      hasEmployerMatch: true,
      employerMatchCap: 3,
      employerMatchCapIsPercentage: true,
      enabled: true,
    },
  ],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('savingsSearchModule', () => {
  it('builds savings and retirement results', () => {
    const results = savingsSearchModule.buildResults(createBudget());

    expect(results.find((r) => r.id === 'savings-sav1')).toBeDefined();
    expect(results.find((r) => r.id === 'retirement-ret1')).toBeDefined();
  });

  it('includes paused badge for paused savings', () => {
    const results = savingsSearchModule.buildResults(createBudget());
    expect(results.find((r) => r.id === 'savings-sav2')?.badge).toBe('Paused');
  });

  it('dispatches open-savings-action through context', () => {
    const updates: { mode?: string; targetId?: string; tab?: string } = {};
    const context: SearchActionContext = {
      setPendingSavingsSearchAction: (value) => {
        if (typeof value === 'string') updates.mode = value;
      },
      setPendingSavingsSearchTargetId: (value) => {
        if (typeof value === 'string') updates.targetId = value;
      },
      setSavingsSearchRequestKey: () => undefined,
      selectTab: (tab) => {
        updates.tab = tab;
      },
    };

    const handler = savingsSearchModule.actionHandlers['open-savings-action'];
    handler({ type: 'open-savings-action', mode: 'edit-savings', targetId: 'sav1' }, context);

    expect(updates.mode).toBe('edit-savings');
    expect(updates.targetId).toBe('sav1');
    expect(updates.tab).toBe('savings');
  });
});
