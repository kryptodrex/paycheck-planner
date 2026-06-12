import {
  formatBillFrequency,
  getAccountNameById,
  getRetirementLabel,
  LOAN_TYPE_LABELS,
  type BudgetData,
} from '@paycheck-planner/core';

export type SearchDestination =
  | { route: '/(tabs)/money'; section: 'bills' | 'loans' | 'savings' | 'income' }
  | { route: '/(tabs)/accounts' }
  | { route: '/taxes' }
  | { route: '/pay-settings' };

export interface PlanSearchResult {
  id: string;
  title: string;
  subtitle: string;
  typeLabel: string;
  destination: SearchDestination;
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

/**
 * Lightweight plan-wide search across every named entity, mirroring the scope
 * of the desktop's plan search overlay. Returns grouped, navigable results.
 */
export function searchPlan(plan: BudgetData, rawQuery: string): PlanSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const results: PlanSearchResult[] = [];
  const accounts = plan.accounts;

  for (const bill of plan.bills) {
    if (matches(query, bill.name, bill.notes, bill.category, 'bill')) {
      results.push({
        id: `bill-${bill.id}`,
        title: bill.name,
        subtitle: `${formatBillFrequency(bill.frequency)} · ${getAccountNameById(accounts, bill.accountId)}`,
        typeLabel: 'Bill',
        destination: { route: '/(tabs)/money', section: 'bills' },
      });
    }
  }

  for (const benefit of plan.benefits) {
    if (matches(query, benefit.name, 'benefit', 'deduction')) {
      results.push({
        id: `benefit-${benefit.id}`,
        title: benefit.name,
        subtitle: benefit.isTaxable ? 'Post-tax deduction' : 'Pre-tax deduction',
        typeLabel: 'Deduction',
        destination: { route: '/(tabs)/money', section: 'bills' },
      });
    }
  }

  for (const loan of plan.loans ?? []) {
    if (matches(query, loan.name, loan.notes, LOAN_TYPE_LABELS[loan.type], 'loan')) {
      results.push({
        id: `loan-${loan.id}`,
        title: loan.name,
        subtitle: `${LOAN_TYPE_LABELS[loan.type] ?? 'Loan'} · ${getAccountNameById(accounts, loan.accountId)}`,
        typeLabel: 'Loan',
        destination: { route: '/(tabs)/money', section: 'loans' },
      });
    }
  }

  for (const item of plan.savingsContributions ?? []) {
    if (matches(query, item.name, item.notes, 'savings', 'investment')) {
      results.push({
        id: `savings-${item.id}`,
        title: item.name,
        subtitle: `${formatBillFrequency(item.frequency)} · ${getAccountNameById(accounts, item.accountId)}`,
        typeLabel: item.type === 'investment' ? 'Investment' : 'Savings',
        destination: { route: '/(tabs)/money', section: 'savings' },
      });
    }
  }

  for (const election of plan.retirement) {
    const label = getRetirementLabel(election);
    if (matches(query, label, election.customLabel, 'retirement', '401k', 'ira')) {
      results.push({
        id: `retirement-${election.id}`,
        title: label,
        subtitle: election.isPreTax === false ? 'Post-tax retirement' : 'Pre-tax retirement',
        typeLabel: 'Retirement',
        destination: { route: '/(tabs)/money', section: 'savings' },
      });
    }
  }

  for (const income of plan.otherIncome ?? []) {
    if (matches(query, income.name, income.notes, 'income', 'bonus')) {
      results.push({
        id: `income-${income.id}`,
        title: income.name,
        subtitle: formatBillFrequency(income.frequency),
        typeLabel: 'Other Income',
        destination: { route: '/(tabs)/money', section: 'income' },
      });
    }
  }

  for (const account of accounts) {
    if (matches(query, account.name, account.type, 'account')) {
      results.push({
        id: `account-${account.id}`,
        title: account.name,
        subtitle: account.type.charAt(0).toUpperCase() + account.type.slice(1),
        typeLabel: 'Account',
        destination: { route: '/(tabs)/accounts' },
      });
    }
  }

  for (const line of plan.taxSettings.taxLines ?? []) {
    if (matches(query, line.label, 'tax', 'withholding')) {
      results.push({
        id: `tax-${line.id}`,
        title: line.label,
        subtitle: line.calculationType === 'fixed' ? 'Fixed per paycheck' : `${line.rate}% of taxable income`,
        typeLabel: 'Tax Line',
        destination: { route: '/taxes' },
      });
    }
  }

  for (const deduction of plan.preTaxDeductions) {
    if (matches(query, deduction.name, 'deduction', 'pre-tax')) {
      results.push({
        id: `pretax-${deduction.id}`,
        title: deduction.name,
        subtitle: 'Pre-tax deduction',
        typeLabel: 'Pre-Tax Deduction',
        destination: { route: '/pay-settings' },
      });
    }
  }

  // Quick actions, mirroring the desktop quick-actions search module.
  const quickActions: { keywords: string[]; result: PlanSearchResult }[] = [
    {
      keywords: ['pay', 'salary', 'hourly', 'frequency', 'paycheck', 'settings'],
      result: {
        id: 'qa-pay-settings',
        title: 'Pay Settings',
        subtitle: 'Salary, frequency, and leftover target',
        typeLabel: 'Quick Action',
        destination: { route: '/pay-settings' },
      },
    },
    {
      keywords: ['tax', 'taxes', 'withholding', 'filing'],
      result: {
        id: 'qa-taxes',
        title: 'Tax Settings',
        subtitle: 'Tax lines, withholding, and filing status',
        typeLabel: 'Quick Action',
        destination: { route: '/taxes' },
      },
    },
  ];

  for (const action of quickActions) {
    if (action.keywords.some((keyword) => keyword.startsWith(query) || query.startsWith(keyword))) {
      results.push(action.result);
    }
  }

  return results;
}
