/**
 * Bills Search Module
 *
 * Contributes search results for Bills and Benefits to the search registry.
 * Also provides action handlers for bill/benefit actions (toggle, edit, delete).
 */

import type { BudgetData } from '../../types/budget';
import type { SearchResult, OpenBillsAction } from '../planSearch';
import type { SearchModule, SearchActionContext } from '../searchRegistry';

/** Format a number as a plain currency string, e.g. "$1,234.56". */
function formatAmount(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Builds search results for Bills and Benefits.
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
      subtitle: `${formatAmount(bill.amount, currency)} · ${freqLabel}${bill.category ? ` · ${bill.category}` : ''}`,
      category: 'Bills',
      categoryIcon: '🧾',
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

  // ── Benefits ──────────────────────────────────────────────────────────────
  for (const benefit of budgetData.benefits ?? []) {
    const paused = benefit.enabled === false;
    results.push({
      id: `benefit-${benefit.id}`,
      title: benefit.name,
      subtitle: benefit.isPercentage
        ? `${benefit.amount}% — ${benefit.isTaxable ? 'taxable' : 'non-taxable'}`
        : `${formatAmount(benefit.amount, currency)} — ${benefit.isTaxable ? 'taxable' : 'non-taxable'}`,
      category: 'Benefits',
      categoryIcon: '🏥',
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
function handleBillsAction(action: unknown, context: SearchActionContext): void {
  // Type guard: ensure this is an OpenBillsAction
  if (typeof action !== 'object' || !action || !('type' in action) || (action as object & Record<string, unknown>).type !== 'open-bills-action') {
    return;
  }

  const billsAction = action as OpenBillsAction;

  if (!context.setPendingBillsSearchAction) {
    console.warn('handleBillsAction: setPendingBillsSearchAction context not provided');
    return;
  }

  context.setPendingBillsSearchAction(billsAction.mode);
  context.setPendingBillsSearchTargetId?.(billsAction.targetId);
  context.setScrollToAccountId?.(undefined);

  // Trigger a request key update to cause the component to react
  context.setBillsSearchRequestKey?.((prev) => (typeof prev === 'number' ? prev + 1 : 1));

  // Navigate to Bills tab
  context.selectTab?.('bills', { resetBillsAnchor: true, revealIfHidden: true });
}

/**
 * The Bills search module.
 * Exports bills and benefits as searchable results and provides action handling.
 */
export const billsSearchModule: SearchModule = {
  id: 'bills',
  buildResults: buildBillsResults,
  actionHandlers: {
    'open-bills-action': handleBillsAction,
  },
};
