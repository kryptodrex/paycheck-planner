import type { BudgetData } from '../../types/budget';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';

function buildAccountsResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];

  for (const account of budgetData.accounts ?? []) {
    const typeLabel = account.type
      ? account.type.charAt(0).toUpperCase() + account.type.slice(1)
      : '';

    results.push({
      id: `account-${account.id}`,
      title: account.name,
      subtitle: typeLabel,
      category: 'Accounts',
      categoryIcon: '🏛️',
      action: { type: 'open-accounts', scrollToAccountId: account.id },
    });
  }

  return results;
}

export const accountsSearchModule: SearchModule = {
  id: 'accounts',
  buildResults: buildAccountsResults,
  actionHandlers: {},
};
