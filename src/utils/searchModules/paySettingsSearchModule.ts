import type { BudgetData } from '../../types/budget';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';
import { formatSearchCurrency } from './moduleUtils';

function getAnnualPaySubtitle(
  annualAmount: number | undefined,
  payType: string,
  currency: string,
): string {
  if (annualAmount != null) return formatSearchCurrency(annualAmount, currency);
  return payType === 'hourly' ? 'Set hourly rate and hours' : 'Set annual salary';
}

function buildPaySettingsResults(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';
  const pay = budgetData.paySettings;

  const annualAmount =
    pay.payType === 'salary'
      ? pay.annualSalary
      : pay.hourlyRate && pay.hoursPerPayPeriod
        ? pay.hourlyRate * pay.hoursPerPayPeriod * 26
        : undefined;

  results.push({
    id: 'pay-settings-annual-pay',
    title: 'Annual Pay',
    subtitle: getAnnualPaySubtitle(annualAmount, pay.payType, currency),
    category: 'Pay Settings',
    categoryIcon: '💰',
    action: { type: 'open-pay-settings', fieldHighlight: pay.payType === 'salary' ? 'annualSalary' : 'hourlyRate' },
  });

  results.push({
    id: 'pay-settings-pay-frequency',
    title: 'Pay Frequency',
    subtitle: pay.payFrequency
      ? pay.payFrequency.charAt(0).toUpperCase() + pay.payFrequency.slice(1).replace(/-/g, ' ')
      : undefined,
    category: 'Pay Settings',
    categoryIcon: '📅',
    action: { type: 'open-pay-settings', fieldHighlight: 'payFrequency' },
  });

  if (pay.payType === 'hourly' && pay.hourlyRate != null) {
    results.push({
      id: 'pay-settings-hourly-rate',
      title: 'Hourly Rate',
      subtitle: formatSearchCurrency(pay.hourlyRate, currency) + '/hr',
      category: 'Pay Settings',
      categoryIcon: '⏱️',
      action: { type: 'open-pay-settings', fieldHighlight: 'hourlyRate' },
    });
  }

  return results;
}

export const paySettingsSearchModule: SearchModule = {
  id: 'pay-settings',
  buildResults: buildPaySettingsResults,
  actionHandlers: {},
};
