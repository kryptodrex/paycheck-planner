import { describe, expect, it } from 'vitest';

import type { Account } from '../types/accounts';
import { buildAccountRows, getAccountNameById, groupByAccountId } from './accountGrouping';

const accounts: Account[] = [
  { id: 'checking', name: 'Checking', type: 'checking', color: '#111111' },
  { id: 'savings', name: 'Savings', type: 'savings', color: '#222222' },
  { id: 'investment', name: 'Brokerage', type: 'investment', color: '#333333' },
];

describe('accountGrouping', () => {
  it('groups items by account id', () => {
    const grouped = groupByAccountId([
      { id: '1', accountId: 'checking', amount: 10 },
      { id: '2', accountId: 'checking', amount: 20 },
      { id: '3', accountId: 'savings', amount: 30 },
    ]);

    expect(grouped).toEqual({
      checking: [
        { id: '1', accountId: 'checking', amount: 10 },
        { id: '2', accountId: 'checking', amount: 20 },
      ],
      savings: [
        { id: '3', accountId: 'savings', amount: 30 },
      ],
    });
  });

  it('builds sorted account rows and excludes empty accounts', () => {
    const grouped = groupByAccountId([
      { id: '1', accountId: 'checking', monthlyAmount: 50 },
      { id: '2', accountId: 'checking', monthlyAmount: 25 },
      { id: '3', accountId: 'savings', monthlyAmount: 100 },
    ]);

    const rows = buildAccountRows(accounts, grouped, (items) => items.reduce((sum, item) => sum + item.monthlyAmount, 0));

    expect(rows).toEqual([
      {
        account: accounts[1],
        items: [{ id: '3', accountId: 'savings', monthlyAmount: 100 }],
        totalMonthly: 100,
      },
      {
        account: accounts[0],
        items: [
          { id: '1', accountId: 'checking', monthlyAmount: 50 },
          { id: '2', accountId: 'checking', monthlyAmount: 25 },
        ],
        totalMonthly: 75,
      },
    ]);
  });

  it('returns a stable fallback for missing account names', () => {
    expect(getAccountNameById(accounts, 'savings')).toBe('Savings');
    expect(getAccountNameById(accounts, 'missing')).toBe('Unknown Account');
    expect(getAccountNameById(accounts)).toBe('Unknown Account');
  });
});