import {
  formatBillFrequency,
  getAccountNameById,
  getRetirementLabel,
  LOAN_TYPE_LABELS,
  type BudgetData,
} from '@paycheck-planner/core';
// Type-only import: keeps the glyph-name type without pulling the native icon
// module into non-RN contexts (e.g. the vitest/jsdom test runner).
import type { Feather } from '@expo/vector-icons';

export type MoneySection = 'bills' | 'loans' | 'savings' | 'income';

/**
 * Where a search result navigates. `tab` targets switch a bottom tab (and can
 * highlight an item or trigger an add sheet); `screen` targets push a stack
 * screen. Search itself is presented as a modal, so the consumer dismisses it
 * appropriately per kind.
 */
export type SearchTarget =
  | { kind: 'tab'; pathname: '/(tabs)/money'; section: MoneySection; highlight?: string; action?: 'add' }
  | { kind: 'tab'; pathname: '/(tabs)/accounts'; highlight?: string; action?: 'add' }
  | { kind: 'screen'; pathname: '/taxes' | '/pay-settings' | '/reallocation' | '/history' };

export interface PlanSearchResult {
  id: string;
  title: string;
  subtitle: string;
  typeLabel: string;
  target: SearchTarget;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  target: SearchTarget;
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

/**
 * Common actions surfaced in search before/while typing — the mobile take on
 * the desktop quick-actions search module.
 */
export function getQuickActions(): QuickAction[] {
  return [
    { id: 'qa-add-bill', title: 'Add a bill', icon: 'file-text', target: { kind: 'tab', pathname: '/(tabs)/money', section: 'bills', action: 'add' } },
    { id: 'qa-add-savings', title: 'Add savings', icon: 'trending-up', target: { kind: 'tab', pathname: '/(tabs)/money', section: 'savings', action: 'add' } },
    { id: 'qa-add-loan', title: 'Add a loan', icon: 'home', target: { kind: 'tab', pathname: '/(tabs)/money', section: 'loans', action: 'add' } },
    { id: 'qa-add-income', title: 'Add other income', icon: 'gift', target: { kind: 'tab', pathname: '/(tabs)/money', section: 'income', action: 'add' } },
    { id: 'qa-add-account', title: 'Add an account', icon: 'credit-card', target: { kind: 'tab', pathname: '/(tabs)/accounts', action: 'add' } },
    { id: 'qa-pay-settings', title: 'Edit pay settings', icon: 'briefcase', target: { kind: 'screen', pathname: '/pay-settings' } },
    { id: 'qa-taxes', title: 'Edit tax settings', icon: 'percent', target: { kind: 'screen', pathname: '/taxes' } },
    { id: 'qa-reallocation', title: 'Review reallocation', icon: 'sliders', target: { kind: 'screen', pathname: '/reallocation' } },
    { id: 'qa-history', title: 'View change history', icon: 'clock', target: { kind: 'screen', pathname: '/history' } },
  ];
}

/**
 * Plan-wide search across every named entity, mirroring the scope of the
 * desktop search overlay. Also surfaces matching quick actions inline.
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'bills', highlight: bill.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'bills', highlight: benefit.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'loans', highlight: loan.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'savings', highlight: item.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'savings', highlight: election.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'income', highlight: income.id },
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
        target: { kind: 'tab', pathname: '/(tabs)/accounts', highlight: account.id },
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
        target: { kind: 'screen', pathname: '/taxes' },
      });
    }
  }

  for (const deduction of plan.preTaxDeductions) {
    if (matches(query, deduction.name, 'deduction', 'pre-tax')) {
      results.push({
        id: `pretax-${deduction.id}`,
        title: deduction.name,
        subtitle: 'Pre-tax deduction',
        typeLabel: 'Deduction',
        target: { kind: 'tab', pathname: '/(tabs)/money', section: 'bills', highlight: deduction.id },
      });
    }
  }

  // Inline matching quick actions (e.g. typing "tax" surfaces "Edit tax settings").
  for (const action of getQuickActions()) {
    if (matches(query, action.title)) {
      results.push({
        id: action.id,
        title: action.title,
        subtitle: 'Quick action',
        typeLabel: 'Action',
        target: action.target,
      });
    }
  }

  return results;
}
