import type { BudgetData } from '../../types/budget';
import type { OpenSavingsAction, SearchResult } from '../planSearch';
import type { SearchActionContext, SearchModule } from '../searchRegistry';
import { createTypedActionHandler, formatSearchCurrency, incrementRequestKey } from './moduleUtils';

function buildSavingsResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';

  for (const contribution of budgetData.savingsContributions ?? []) {
    const paused = contribution.enabled === false;
    const typeLabel = contribution.type === 'investment' ? 'Investment' : 'Savings';
    const freqLabel = contribution.frequency
      ? contribution.frequency.charAt(0).toUpperCase() + contribution.frequency.slice(1)
      : '';

    results.push({
      id: `savings-${contribution.id}`,
      title: contribution.name,
      subtitle: `${formatSearchCurrency(contribution.amount, currency)} · ${freqLabel} · ${typeLabel}`,
      category: 'Savings',
      categoryIcon: '🏦',
      badge: paused ? 'Paused' : undefined,
      inlineActions: [
        {
          id: `toggle-savings-${contribution.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-savings-action', mode: 'toggle-savings', targetId: contribution.id },
        },
        {
          id: `edit-savings-${contribution.id}`,
          label: 'Edit',
          action: { type: 'open-savings-action', mode: 'edit-savings', targetId: contribution.id },
        },
        {
          id: `delete-savings-${contribution.id}`,
          label: 'Delete',
          action: { type: 'open-savings-action', mode: 'delete-savings', targetId: contribution.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['savings', 'contribution', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: `savings-${contribution.id}`,
      },
    });
  }

  for (const election of budgetData.retirement ?? []) {
    const paused = election.enabled === false;
    const label = election.customLabel || election.type.toUpperCase().replace('-', ' ');
    const contribLabel = election.employeeContributionIsPercentage
      ? `${election.employeeContribution}%`
      : formatSearchCurrency(election.employeeContribution, currency) + '/paycheck';

    results.push({
      id: `retirement-${election.id}`,
      title: label,
      subtitle: `Employee contribution: ${contribLabel}${election.hasEmployerMatch ? ' · Employer match' : ''}`,
      category: 'Retirement',
      categoryIcon: '🏖️',
      badge: paused ? 'Paused' : undefined,
      inlineActions: [
        {
          id: `toggle-retirement-${election.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-savings-action', mode: 'toggle-retirement', targetId: election.id },
        },
        {
          id: `edit-retirement-${election.id}`,
          label: 'Edit',
          action: { type: 'open-savings-action', mode: 'edit-retirement', targetId: election.id },
        },
        {
          id: `delete-retirement-${election.id}`,
          label: 'Delete',
          action: { type: 'open-savings-action', mode: 'delete-retirement', targetId: election.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['retirement', 'plan', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: `retirement-${election.id}`,
      },
    });
  }

  return results;
}

const handleSavingsAction = createTypedActionHandler('open-savings-action', (savingsAction: OpenSavingsAction, context: SearchActionContext): void => {

  if (!context.setPendingSavingsSearchAction) {
    console.warn('handleSavingsAction: setPendingSavingsSearchAction context not provided');
    return;
  }

  context.setPendingSavingsSearchAction(savingsAction.mode);
  context.setPendingSavingsSearchTargetId?.(savingsAction.targetId);
  incrementRequestKey(context.setSavingsSearchRequestKey);
  context.selectTab?.('savings', { resetBillsAnchor: true, revealIfHidden: true });
});

export const savingsSearchModule: SearchModule = {
  id: 'savings',
  buildResults: buildSavingsResults,
  actionHandlers: {
    'open-savings-action': handleSavingsAction,
  },
};
