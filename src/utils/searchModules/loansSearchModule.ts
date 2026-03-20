import type { BudgetData } from '../../types/budget';
import type { OpenLoansAction, SearchResult } from '../planSearch';
import type { SearchActionContext, SearchModule } from '../searchRegistry';
import { createTypedActionHandler, formatSearchCurrency, incrementRequestKey } from './moduleUtils';

function buildLoansResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';

  for (const loan of budgetData.loans ?? []) {
    const paused = loan.enabled === false;
    const typeLabel = loan.type
      ? loan.type.charAt(0).toUpperCase() + loan.type.slice(1).replace(/-/g, ' ')
      : '';

    results.push({
      id: `loan-${loan.id}`,
      title: loan.name,
      subtitle: `${formatSearchCurrency(loan.currentBalance, currency)} balance · ${typeLabel} · ${loan.interestRate}% APR`,
      category: 'Loans',
      categoryIcon: '💳',
      badge: paused ? 'Paused' : undefined,
      inlineActions: [
        {
          id: `toggle-loan-${loan.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-loans-action', mode: 'toggle-loan', targetId: loan.id },
        },
        {
          id: `edit-loan-${loan.id}`,
          label: 'Edit',
          action: { type: 'open-loans-action', mode: 'edit-loan', targetId: loan.id },
        },
        {
          id: `delete-loan-${loan.id}`,
          label: 'Delete',
          action: { type: 'open-loans-action', mode: 'delete-loan', targetId: loan.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['loan', 'payment', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'loans',
        elementId: `loan-${loan.id}`,
      },
    });
  }

  return results;
}

const handleLoansAction = createTypedActionHandler('open-loans-action', (loansAction: OpenLoansAction, context: SearchActionContext): void => {

  if (!context.setPendingLoansSearchAction) {
    console.warn('handleLoansAction: setPendingLoansSearchAction context not provided');
    return;
  }

  context.setPendingLoansSearchAction(loansAction.mode);
  context.setPendingLoansSearchTargetId?.(loansAction.targetId);
  context.setScrollToAccountId?.(undefined);
  incrementRequestKey(context.setLoansSearchRequestKey);
  context.selectTab?.('loans', { resetBillsAnchor: true, revealIfHidden: true });
});

export const loansSearchModule: SearchModule = {
  id: 'loans',
  buildResults: buildLoansResults,
  actionHandlers: {
    'open-loans-action': handleLoansAction,
  },
};
