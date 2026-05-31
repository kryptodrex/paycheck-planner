import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import type { SearchActionContext } from '../searchRegistry';
import { otherIncomeSearchModule } from './otherIncomeSearchModule';

const createBudget = (): BudgetData => ({
  id: 'other-income-test',
  name: 'Other Income Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 104000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  otherIncome: [
    {
      id: 'income-1',
      name: 'Side Studio',
      incomeType: 'personal-business',
      amountMode: 'fixed',
      amount: 300,
      frequency: 'monthly',
      enabled: true,
      notes: 'Weekend clients',
      isTaxable: true,
      payTreatment: 'net',
      withholdingMode: 'manual',
    },
    {
      id: 'income-2',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 2400,
      frequency: 'yearly',
      enabled: false,
      notes: '',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    },
  ],
  benefits: [],
  bills: [],
  loans: [],
  savingsContributions: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('otherIncomeSearchModule', () => {
  it('builds results for other income entries including Personal Business', () => {
    const results = otherIncomeSearchModule.buildResults(createBudget());

    expect(results.find((result) => result.id === 'other-income-income-1')?.subtitle).toContain('Personal Business');
    expect(results.find((result) => result.id === 'other-income-income-2')?.badge).toBe('Paused');
  });

  it('dispatches open-other-income-action through context', () => {
    const updates: { mode?: string; targetId?: string; tab?: string } = {};
    const context: SearchActionContext = {
      setPendingOtherIncomeSearchAction: (value) => {
        if (typeof value === 'string') updates.mode = value;
      },
      setPendingOtherIncomeSearchTargetId: (value) => {
        if (typeof value === 'string') updates.targetId = value;
      },
      setOtherIncomeSearchRequestKey: () => undefined,
      selectTab: (tab) => {
        updates.tab = tab;
      },
    };

    const handler = otherIncomeSearchModule.actionHandlers['open-other-income-action'];
    handler({ type: 'open-other-income-action', mode: 'edit-other-income', targetId: 'income-1' }, context);

    expect(updates.mode).toBe('edit-other-income');
    expect(updates.targetId).toBe('income-1');
    expect(updates.tab).toBe('other-income');
  });
});