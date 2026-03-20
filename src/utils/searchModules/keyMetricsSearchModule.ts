import type { BudgetData } from '../../types/budget';
import { calculateAnnualizedPaySummary, calculatePaycheckBreakdown } from '../../services/budgetCalculations';
import { convertBillToYearly } from '../billFrequency';
import { getPaychecksPerYear } from '../payPeriod';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';
import { formatSearchCurrency } from './moduleUtils';

function buildKeyMetricsResults(budgetData: BudgetData): SearchResult[] {
  const currency = budgetData.settings?.currency ?? 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const paycheckBreakdown = calculatePaycheckBreakdown(budgetData);
  const annualizedSummary = calculateAnnualizedPaySummary(paycheckBreakdown, paychecksPerYear);

  const annualBills = (budgetData.bills ?? [])
    .filter((bill) => bill.enabled !== false)
    .reduce((sum, bill) => sum + convertBillToYearly(bill.amount, bill.frequency), 0);
  const annualRemainingForSpending = Math.max(annualizedSummary.annualNet - annualBills, 0);

  return [
    {
      id: 'key-metrics-total-income',
      title: 'Total Income',
      subtitle: `${formatSearchCurrency(annualizedSummary.annualGross, currency)} yearly`,
      category: 'Key Metrics',
      categoryIcon: '📈',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-income-card',
      },
    },
    {
      id: 'key-metrics-total-taxes',
      title: 'Total Taxes',
      subtitle: `${formatSearchCurrency(annualizedSummary.annualTaxes, currency)} yearly`,
      category: 'Key Metrics',
      categoryIcon: '🏛️',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-taxes-card',
      },
    },
    {
      id: 'key-metrics-total-bills',
      title: 'Total Bills',
      subtitle: `${formatSearchCurrency(annualBills, currency)} yearly`,
      category: 'Key Metrics',
      categoryIcon: '📋',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-bills-card',
      },
    },
    {
      id: 'key-metrics-savings-rate',
      title: 'Savings Rate',
      subtitle: 'Savings and investment progress',
      category: 'Key Metrics',
      categoryIcon: '🏦',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-savings-rate-card',
      },
    },
    {
      id: 'key-metrics-take-home-pay',
      title: 'Take Home Pay',
      subtitle: `${formatSearchCurrency(annualizedSummary.annualNet, currency)} yearly`,
      category: 'Key Metrics',
      categoryIcon: '✅',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-net-pay-card',
      },
    },
    {
      id: 'key-metrics-remaining-for-spending',
      title: 'Remaining for Spending',
      subtitle: `${formatSearchCurrency(annualRemainingForSpending, currency)} yearly`,
      category: 'Key Metrics',
      categoryIcon: '💵',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-remaining-card',
      },
    },
    {
      id: 'key-metrics-yearly-pay-breakdown',
      title: 'Yearly Pay Breakdown',
      subtitle: 'Bar, stacked, and pie summary views',
      category: 'Key Metrics',
      categoryIcon: '📊',
      action: {
        type: 'navigate-tab',
        tabId: 'metrics',
        elementId: 'key-metrics-yearly-breakdown',
      },
    },
  ];
}

export const keyMetricsSearchModule: SearchModule = {
  id: 'key-metrics',
  buildResults: buildKeyMetricsResults,
  actionHandlers: {},
};
