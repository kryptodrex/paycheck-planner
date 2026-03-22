import { TrendingDown } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';
import { formatSearchCurrency } from './moduleUtils';

function buildPreTaxDeductionsResults(budgetData: BudgetData): SearchResult[] {
  const currency = budgetData.settings?.currency ?? 'USD';
  const results: SearchResult[] = [];

  for (const deduction of budgetData.preTaxDeductions ?? []) {
    results.push({
      id: `deduction-${deduction.id}`,
      title: deduction.name,
      subtitle: deduction.isPercentage
        ? `${deduction.amount}% of gross pay`
        : formatSearchCurrency(deduction.amount, currency) + ' per paycheck',
      category: 'Pre-Tax Deductions',
      categoryIcon: TrendingDown,
      action: { type: 'navigate-tab', tabId: 'breakdown' },
    });
  }

  return results;
}

export const preTaxDeductionsSearchModule: SearchModule = {
  id: 'pre-tax-deductions',
  buildResults: buildPreTaxDeductionsResults,
  actionHandlers: {},
};
