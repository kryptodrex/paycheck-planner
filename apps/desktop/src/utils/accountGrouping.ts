import type { Account } from '../types/accounts';

export type AccountGroupedItems<T> = Record<string, T[]>;

export type AccountRow<T> = {
  account: Account;
  items: T[];
  totalMonthly: number;
};

export function groupByAccountId<T extends { accountId: string }>(items: T[]): AccountGroupedItems<T> {
  return items.reduce<AccountGroupedItems<T>>((groupedItems, item) => {
    if (!groupedItems[item.accountId]) {
      groupedItems[item.accountId] = [];
    }

    groupedItems[item.accountId].push(item);
    return groupedItems;
  }, {});
}

export function buildAccountRows<T>(
  accounts: Account[],
  groupedItems: AccountGroupedItems<T>,
  getTotalMonthly: (items: T[], account: Account) => number,
): AccountRow<T>[] {
  return accounts
    .map((account) => {
      const items = groupedItems[account.id] || [];
      return {
        account,
        items,
        totalMonthly: getTotalMonthly(items, account),
      };
    })
    .filter(({ items }) => items.length > 0)
    .sort((leftRow, rightRow) => rightRow.totalMonthly - leftRow.totalMonthly);
}

export function getAccountNameById(accounts: Account[], accountId?: string): string {
  if (!accountId) {
    return 'Unknown Account';
  }

  return accounts.find((account) => account.id === accountId)?.name || 'Unknown Account';
}