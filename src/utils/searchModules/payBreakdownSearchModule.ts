import { Banknote, Calculator, HandCoins, Pin, ReceiptText, Scale, TrendingDown, Wallet } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import { calculateAnnualizedPaySummary, calculatePaycheckBreakdown } from '../../services/budgetCalculations';
import { convertBillToYearly } from '../billFrequency';
import { getPaychecksPerYear } from '../payPeriod';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';
import { formatSearchCurrency } from './moduleUtils';

function buildPayBreakdownResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const paycheckBreakdown = calculatePaycheckBreakdown(budgetData);
  const annualizedSummary = calculateAnnualizedPaySummary(paycheckBreakdown, paychecksPerYear);

  const annualBills = (budgetData.bills ?? [])
    .filter((bill) => bill.enabled !== false)
    .reduce((sum, bill) => sum + convertBillToYearly(bill.amount, bill.frequency), 0);
  const annualRemainingForSpending = Math.max(annualizedSummary.annualNet - annualBills, 0);

  const hasPreTaxDeductions = paycheckBreakdown.preTaxDeductions > 0;
  const postTaxDeductionsAmount = Math.max(
    0,
    paycheckBreakdown.taxableIncome - paycheckBreakdown.totalTaxes - paycheckBreakdown.netPay,
  );
  const hasPostTaxDeductions = postTaxDeductionsAmount > 0;
  const hasAfterTaxAllocations = (budgetData.accounts ?? []).length > 0;

  results.push(
    {
      id: 'pay-breakdown-gross-pay',
      title: 'Gross Pay',
      subtitle: `${formatSearchCurrency(paycheckBreakdown.grossPay, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: Banknote,
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-gross-pay',
      },
    },
    {
      id: 'pay-breakdown-total-taxes',
      title: 'Total Taxes',
      subtitle: `${formatSearchCurrency(paycheckBreakdown.totalTaxes, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: Scale,
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-total-taxes',
      },
    },
    {
      id: 'pay-breakdown-taxable-income',
      title: 'Taxable Income',
      subtitle: `${formatSearchCurrency(paycheckBreakdown.taxableIncome, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: Calculator,
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-taxable-income',
      },
    },
    ...(hasPreTaxDeductions
      ? [
          {
            id: 'pay-breakdown-pre-tax-deductions',
            title: 'Pre-Tax Deductions',
            subtitle: `${formatSearchCurrency(paycheckBreakdown.preTaxDeductions, currency)} per paycheck`,
            category: 'Pay Breakdown',
            categoryIcon: TrendingDown,
            action: {
              type: 'navigate-tab' as const,
              tabId: 'breakdown' as const,
              elementId: 'pay-breakdown-pre-tax-deductions',
            },
          },
        ]
      : []),
    ...(hasPostTaxDeductions
      ? [
          {
            id: 'pay-breakdown-post-tax-deductions',
            title: 'Post-Tax Deductions',
            subtitle: `${formatSearchCurrency(postTaxDeductionsAmount, currency)} per paycheck`,
            category: 'Pay Breakdown',
            categoryIcon: Pin,
            action: {
              type: 'navigate-tab' as const,
              tabId: 'breakdown' as const,
              elementId: 'pay-breakdown-post-tax-deductions',
            },
          },
        ]
      : []),
    {
      id: 'pay-breakdown-net-pay',
      title: 'Net Pay',
      subtitle: `${formatSearchCurrency(paycheckBreakdown.netPay, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: HandCoins,
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-net-pay',
      },
    },
    {
      id: 'pay-breakdown-remaining-for-spending',
      title: 'All That Remains for Spending',
      subtitle: `${formatSearchCurrency(Math.max(annualRemainingForSpending / Math.max(paychecksPerYear, 1), 0), currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: Wallet,
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-remaining-for-spending',
      },
    },
    ...(hasAfterTaxAllocations
      ? [
          {
            id: 'pay-breakdown-after-tax-allocations',
            title: 'After-Tax Allocations',
            subtitle: 'Account funding and category allocations',
            category: 'Pay Breakdown',
            categoryIcon: ReceiptText,
            action: {
              type: 'navigate-tab' as const,
              tabId: 'breakdown' as const,
              elementId: 'pay-breakdown-after-tax-allocations',
            },
          },
        ]
      : []),
  );

  return results;
}

export const payBreakdownSearchModule: SearchModule = {
  id: 'pay-breakdown',
  buildResults: buildPayBreakdownResults,
  actionHandlers: {},
};
