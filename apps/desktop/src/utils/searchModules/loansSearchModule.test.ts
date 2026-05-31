import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import type { SearchActionContext } from '../searchRegistry';
import { loansSearchModule } from './loansSearchModule';

const createBudget = (): BudgetData => ({
  id: 'loan-test',
  name: 'Loan Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 90000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  benefits: [],
  retirement: [],
  savingsContributions: [],
  loans: [
    {
      id: 'loan1',
      name: 'Student Loan',
      principal: 18000,
      currentBalance: 12000,
      monthlyPayment: 220,
      interestRate: 5.4,
      type: 'student',
      accountId: 'account-1',
      startDate: '2023-01-01',
      enabled: true,
    },
    {
      id: 'loan2',
      name: 'Auto Loan',
      principal: 12000,
      currentBalance: 8500,
      monthlyPayment: 310,
      interestRate: 6.2,
      type: 'auto',
      accountId: 'account-1',
      startDate: '2024-06-01',
      enabled: false,
    },
  ],
  bills: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('loansSearchModule', () => {
  it('builds loan results with inline actions', () => {
    const results = loansSearchModule.buildResults(createBudget());
    const loan = results.find((r) => r.id === 'loan-loan1');

    expect(loan).toBeDefined();
    expect(loan?.category).toBe('Loans');
    expect(loan?.inlineActions).toHaveLength(3);
  });

  it('marks paused loan with badge', () => {
    const results = loansSearchModule.buildResults(createBudget());
    const paused = results.find((r) => r.id === 'loan-loan2');

    expect(paused?.badge).toBe('Paused');
  });

  it('dispatches open-loans-action through context', () => {
    const updates: { mode?: string; targetId?: string; tab?: string } = {};
    const context: SearchActionContext = {
      setPendingLoansSearchAction: (value) => {
        if (typeof value === 'string') updates.mode = value;
      },
      setPendingLoansSearchTargetId: (value) => {
        if (typeof value === 'string') updates.targetId = value;
      },
      setLoansSearchRequestKey: () => undefined,
      setScrollToAccountId: () => undefined,
      selectTab: (tab) => {
        updates.tab = tab;
      },
    };

    const handler = loansSearchModule.actionHandlers['open-loans-action'];
    handler({ type: 'open-loans-action', mode: 'edit-loan', targetId: 'loan1' }, context);

    expect(updates.mode).toBe('edit-loan');
    expect(updates.targetId).toBe('loan1');
    expect(updates.tab).toBe('loans');
  });
});
