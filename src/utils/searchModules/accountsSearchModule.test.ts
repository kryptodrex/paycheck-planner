import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { accountsSearchModule } from './accountsSearchModule';

const budget: BudgetData = {
  id: 'accounts-test',
  name: 'Accounts Test',
  year: 2026,
  paySettings: { payType: 'salary', annualSalary: 84000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  benefits: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  savingsContributions: [],
  loans: [],
  bills: [],
  accounts: [
    { id: 'a1', name: 'Checking', type: 'checking', allocation: 0, color: '#4B5563' },
    { id: 'a2', name: 'Savings', type: 'savings', allocation: 0, color: '#10B981' },
  ],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('accountsSearchModule', () => {
  it('builds account entries', () => {
    const results = accountsSearchModule.buildResults(budget);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('account-a1');
    expect(results.map((r) => r.id)).toContain('account-a2');
  });

  it('maps account action to open-accounts with account id', () => {
    const results = accountsSearchModule.buildResults(budget);
    const account = results.find((r) => r.id === 'account-a1');

    expect(account?.action).toMatchObject({ type: 'open-accounts', scrollToAccountId: 'a1' });
  });
});
