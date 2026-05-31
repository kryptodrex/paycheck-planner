import { Scale } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import { calculatePaycheckBreakdown } from '../../services/budgetCalculations';
import type { OpenTaxesAction, SearchResult } from '../planSearch';
import type { SearchActionContext, SearchModule } from '../searchRegistry';
import { TAB_IDS } from '../../constants/tabIds';
import { createTypedActionHandler, formatSearchCurrency, incrementRequestKey } from './moduleUtils';

function buildTaxesResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';
  const paycheckBreakdown = calculatePaycheckBreakdown(budgetData);

  for (const line of budgetData.taxSettings?.taxLines ?? []) {
    results.push({
      id: `tax-${line.id}`,
      title: line.label,
      subtitle:
        line.calculationType === 'fixed'
          ? formatSearchCurrency(line.amount ?? 0, currency) + ' (fixed)'
          : `${line.rate}%`,
      category: 'Tax',
      categoryIcon: Scale,
      action: { type: 'navigate-tab', tabId: TAB_IDS.taxes, elementId: `tax-line-${line.id}` },
    });
  }

  if ((budgetData.taxSettings?.additionalWithholding ?? 0) > 0) {
    results.push({
      id: 'tax-additional-withholding',
      title: 'Additional Withholding',
      subtitle: formatSearchCurrency(budgetData.taxSettings?.additionalWithholding ?? 0, currency) + ' per paycheck',
      category: 'Tax',
      categoryIcon: Scale,
      action: { type: 'navigate-tab', tabId: TAB_IDS.taxes, elementId: 'tax-additional-withholding-row' },
    });
  }

  results.push({
    id: 'tax-total-taxes',
    title: 'Total Taxes',
    subtitle: formatSearchCurrency(paycheckBreakdown.totalTaxes, currency) + ' per paycheck',
    category: 'Tax',
    categoryIcon: Scale,
    action: { type: 'navigate-tab', tabId: TAB_IDS.taxes, elementId: 'tax-total-taxes-row' },
  });

  return results;
}

const handleTaxesAction = createTypedActionHandler('open-taxes-action', (taxesAction: OpenTaxesAction, context: SearchActionContext): void => {
  if (taxesAction.mode !== 'open-settings') {
    return;
  }

  incrementRequestKey(context.setTaxSearchOpenSettingsRequestKey);
  context.selectTab?.('taxes', { resetBillsAnchor: true, revealIfHidden: true });
});

export const taxesSearchModule: SearchModule = {
  id: 'taxes',
  buildResults: buildTaxesResults,
  actionHandlers: {
    'open-taxes-action': handleTaxesAction,
  },
};
