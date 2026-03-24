/**
 * Bills Search Module
 *
 * Contributes search results for Bills and Deductions to the search registry.
 * Also provides action handlers for bill/benefit actions (toggle, edit, delete).
 */

import { HeartPulse, ReceiptText } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import type { SearchResult, OpenBillsAction } from '../planSearch';
import type { SearchModule, SearchActionContext } from '../searchRegistry';
import { createTypedActionHandler, formatSearchCurrency, incrementRequestKey } from './moduleUtils';

/**
 * Builds search results for Bills and Deductions.
 */
function buildBillsResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';

  // ── Bills ─────────────────────────────────────────────────────────────────
  for (const bill of budgetData.bills ?? []) {
    const paused = bill.enabled === false;
    const freqLabel = bill.frequency
      ? bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1)
      : '';
    results.push({
      id: `bill-${bill.id}`,
      title: bill.name,
      subtitle: `${formatSearchCurrency(bill.amount, currency)} · ${freqLabel}${bill.category ? ` · ${bill.category}` : ''}`,
      category: 'Bills',
      categoryIcon: ReceiptText,
      badge: paused ? 'Paused' : bill.discretionary ? 'Discretionary' : undefined,
      inlineActions: [
        {
          id: `toggle-bill-${bill.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-bills-action', mode: 'toggle-bill', targetId: bill.id },
        },
        {
          id: `edit-bill-${bill.id}`,
          label: 'Edit',
          action: { type: 'open-bills-action', mode: 'edit-bill', targetId: bill.id },
        },
        {
          id: `delete-bill-${bill.id}`,
          label: 'Delete',
          action: { type: 'open-bills-action', mode: 'delete-bill', targetId: bill.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['bill', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'bills',
        elementId: `bill-${bill.id}`,
      },
    });
  }

  // ── Deductions ────────────────────────────────────────────────────────────
  for (const benefit of budgetData.benefits ?? []) {
    const paused = benefit.enabled === false;
    results.push({
      id: `benefit-${benefit.id}`,
      title: benefit.name,
      subtitle: benefit.isPercentage
        ? `${benefit.amount}% — ${benefit.isTaxable ? 'taxable' : 'non-taxable'}`
        : `${formatSearchCurrency(benefit.amount, currency)} — ${benefit.isTaxable ? 'taxable' : 'non-taxable'}`,
      category: 'Deductions',
      categoryIcon: HeartPulse,
      badge: paused ? 'Paused' : undefined,
      inlineActions: [
        {
          id: `toggle-benefit-${benefit.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-bills-action', mode: 'toggle-benefit', targetId: benefit.id },
        },
        {
          id: `edit-benefit-${benefit.id}`,
          label: 'Edit',
          action: { type: 'open-bills-action', mode: 'edit-benefit', targetId: benefit.id },
        },
        {
          id: `delete-benefit-${benefit.id}`,
          label: 'Delete',
          action: { type: 'open-bills-action', mode: 'delete-benefit', targetId: benefit.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['deduction', 'benefit', 'pause', 'resume', 'edit', 'delete'],
      action: { type: 'navigate-tab', tabId: 'bills', elementId: `benefit-${benefit.id}` },
    });
  }

  return results;
}

/**
 * Handles open-bills-action dispatches from search results.
 * Updates PlanDashboard state to trigger the appropriate modal/action.
 */
const handleBillsAction = createTypedActionHandler('open-bills-action', (billsAction: OpenBillsAction, context: SearchActionContext): void => {

  if (!context.setPendingBillsSearchAction) {
    console.warn('handleBillsAction: setPendingBillsSearchAction context not provided');
    return;
  }

  context.setPendingBillsSearchAction(billsAction.mode);
  context.setPendingBillsSearchTargetId?.(billsAction.targetId);
  context.setScrollToAccountId?.(undefined);

  // Trigger a request key update to cause the component to react
  incrementRequestKey(context.setBillsSearchRequestKey);

  // Navigate to Bills tab
  context.selectTab?.('bills', { resetBillsAnchor: true, revealIfHidden: true });
});

/**
 * The Bills search module.
 * Exports bills and deductions as searchable results and provides action handling.
 */
export const billsSearchModule: SearchModule = {
  id: 'bills',
  buildResults: buildBillsResults,
  actionHandlers: {
    'open-bills-action': handleBillsAction,
  },
};
