import { HandCoins } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import type { OpenOtherIncomeAction, SearchResult } from '../planSearch';
import type { SearchActionContext, SearchModule } from '../searchRegistry';
import { calculateOtherIncomePerPaycheckAmount } from '../otherIncome';
import { getOtherIncomePayTreatmentLabel, getOtherIncomeTypeLabel } from '../otherIncomeLabels';
import { calculateGrossPayPerPaycheck, getPaychecksPerYear } from '../payPeriod';
import { createTypedActionHandler, formatSearchCurrency, incrementRequestKey } from './moduleUtils';

function buildOtherIncomeResults(budgetData: BudgetData): SearchResult[] {
  const currency = budgetData.settings?.currency ?? 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const baseGrossPayPerPaycheck = calculateGrossPayPerPaycheck(budgetData.paySettings);

  return (budgetData.otherIncome ?? []).map((entry) => {
    const paused = entry.enabled === false;
    const perPaycheckAmount = calculateOtherIncomePerPaycheckAmount(entry, baseGrossPayPerPaycheck, paychecksPerYear);

    return {
      id: `other-income-${entry.id}`,
      title: entry.name,
      subtitle: `${formatSearchCurrency(perPaycheckAmount, currency)} per paycheck · ${getOtherIncomeTypeLabel(entry.incomeType)} · ${getOtherIncomePayTreatmentLabel(entry.payTreatment)}`,
      category: 'Other Income',
      categoryIcon: HandCoins,
      badge: paused ? 'Paused' : undefined,
      inlineActions: [
        {
          id: `toggle-other-income-${entry.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-other-income-action', mode: 'toggle-other-income', targetId: entry.id },
        },
        {
          id: `edit-other-income-${entry.id}`,
          label: 'Edit',
          action: { type: 'open-other-income-action', mode: 'edit-other-income', targetId: entry.id },
        },
        {
          id: `delete-other-income-${entry.id}`,
          label: 'Delete',
          action: { type: 'open-other-income-action', mode: 'delete-other-income', targetId: entry.id },
          variant: 'danger',
        },
      ],
      searchKeywords: [
        'other income',
        'income',
        getOtherIncomeTypeLabel(entry.incomeType).toLowerCase(),
        getOtherIncomePayTreatmentLabel(entry.payTreatment).toLowerCase(),
        'pause',
        'resume',
        'edit',
        'delete',
      ],
      action: {
        type: 'navigate-tab',
        tabId: 'other-income',
        elementId: `other-income-${entry.id}`,
      },
    };
  });
}

const handleOtherIncomeAction = createTypedActionHandler('open-other-income-action', (otherIncomeAction: OpenOtherIncomeAction, context: SearchActionContext): void => {
  if (!context.setPendingOtherIncomeSearchAction) {
    console.warn('handleOtherIncomeAction: setPendingOtherIncomeSearchAction context not provided');
    return;
  }

  context.setPendingOtherIncomeSearchAction(otherIncomeAction.mode);
  context.setPendingOtherIncomeSearchTargetId?.(otherIncomeAction.targetId);
  incrementRequestKey(context.setOtherIncomeSearchRequestKey);
  context.selectTab?.('other-income', { resetBillsAnchor: true, revealIfHidden: true });
});

export const otherIncomeSearchModule: SearchModule = {
  id: 'other-income',
  buildResults: buildOtherIncomeResults,
  actionHandlers: {
    'open-other-income-action': handleOtherIncomeAction,
  },
};