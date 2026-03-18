/**
 * Plan-wide search utility
 *
 * Indexes all data in an open BudgetData plan and returns ranked, navigable
 * search results.  Results carry a typed `action` that callers use to navigate
 * the user to the matching item (switch tab, scroll to element, open a modal, etc.).
 */

import type { BudgetData } from '../types/budget';
import type { TabId } from './tabManagement';

// ─── Action types ───────────────────────────────────────────────────────────

/** Navigate to a plan tab, optionally scrolling a DOM element into view. */
export interface NavigateTabAction {
  type: 'navigate-tab';
  tabId: TabId;
  /** DOM element id to scroll into view after the tab is active */
  elementId?: string;
}

/** Open the Pay Settings modal and optionally highlight a field. */
export interface OpenPaySettingsAction {
  type: 'open-pay-settings';
  fieldHighlight?: string;
}

/** Open the Accounts modal, optionally scrolling to a specific account. */
export interface OpenAccountsAction {
  type: 'open-accounts';
  scrollToAccountId?: string;
}

/** Open the app Settings modal. */
export interface OpenSettingsAction {
  type: 'open-settings';
}

export type SearchResultAction =
  | NavigateTabAction
  | OpenPaySettingsAction
  | OpenAccountsAction
  | OpenSettingsAction;

// ─── Result type ─────────────────────────────────────────────────────────────

export interface SearchResult {
  /** Unique identifier for this result (used as React key) */
  id: string;
  /** Primary display label */
  title: string;
  /** Secondary info line (amount, type, frequency, etc.) */
  subtitle?: string;
  /** Grouping label shown in the results list (e.g. "Bills", "Savings") */
  category: string;
  /** Emoji icon for the category */
  categoryIcon: string;
  /** Optional badge text (e.g. disabled, paused) */
  badge?: string;
  /** What to do when the user selects this result */
  action: SearchResultAction;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Returns true when the haystack contains every token present in the needle.
 * A query like "rent monthly" will match a bill named "Rent" with frequency "monthly".
 */
function matches(needle: string, ...haystacks: (string | undefined | null)[]): boolean {
  const tokens = normalize(needle).split(/\s+/).filter(Boolean);
  const combined = haystacks
    .filter((h): h is string => !!h)
    .map(normalize)
    .join(' ');
  return tokens.every((token) => combined.includes(token));
}

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
 * Returns true when the query looks like an amount comparison.
 * Supports: ">500", "<500", ">=500", "<=500", "=500", "500", "$500"
 */
function parseAmountQuery(
  query: string,
): { operator: string; value: number } | null {
  const m = query.trim().match(/^([><=]{0,2})\s*\$?\s*(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const operator = m[1] || '=';
  const value = parseFloat(m[2].replace(/,/g, ''));
  if (isNaN(value)) return null;
  return { operator, value };
}

function amountMatches(
  amount: number,
  { operator, value }: { operator: string; value: number },
): boolean {
  switch (operator) {
    case '>':
      return amount > value;
    case '>=':
      return amount >= value;
    case '<':
      return amount < value;
    case '<=':
      return amount <= value;
    case '=':
    case '==':
      return amount === value;
    default:
      return Math.abs(amount - value) < 0.01;
  }
}

// ─── Index builder ────────────────────────────────────────────────────────────

/** Build the subtitle for the Annual Pay search result. */
function getAnnualPaySubtitle(
  annualAmount: number | undefined,
  payType: string,
  currency: string,
): string {
  if (annualAmount != null) return formatAmount(annualAmount, currency);
  return payType === 'salary' ? 'Salary' : 'Hourly';
}

/**
 * Build a flat list of all searchable items from the plan.
 * This is intentionally exhaustive — the caller filters by query.
 */
export function buildSearchIndex(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';

  // ── Pay Settings fields ───────────────────────────────────────────────────
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
    action: { type: 'open-pay-settings', fieldHighlight: 'annualSalary' },
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
      subtitle: formatAmount(pay.hourlyRate, currency) + '/hr',
      category: 'Pay Settings',
      categoryIcon: '⏱️',
      action: { type: 'open-pay-settings', fieldHighlight: 'hourlyRate' },
    });
  }

  // ── Pre-tax deductions ────────────────────────────────────────────────────
  for (const deduction of budgetData.preTaxDeductions ?? []) {
    results.push({
      id: `deduction-${deduction.id}`,
      title: deduction.name,
      subtitle: deduction.isPercentage
        ? `${deduction.amount}% of gross pay`
        : formatAmount(deduction.amount, currency) + ' per paycheck',
      category: 'Pre-Tax Deductions',
      categoryIcon: '📉',
      action: { type: 'navigate-tab', tabId: 'breakdown' },
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
      action: { type: 'navigate-tab', tabId: 'bills', elementId: 'account-paycheck' },
    });
  }

  // ── Tax lines ─────────────────────────────────────────────────────────────
  for (const line of budgetData.taxSettings?.taxLines ?? []) {
    results.push({
      id: `tax-${line.id}`,
      title: line.label,
      subtitle:
        line.calculationType === 'fixed'
          ? formatAmount(line.amount ?? 0, currency) + ' (fixed)'
          : `${line.rate}%`,
      category: 'Tax',
      categoryIcon: '🏛️',
      action: { type: 'navigate-tab', tabId: 'taxes' },
    });
  }

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
      action: {
        type: 'navigate-tab',
        tabId: 'bills',
        elementId: bill.accountId ? `account-${bill.accountId}` : undefined,
      },
    });
  }

  // ── Savings contributions ─────────────────────────────────────────────────
  for (const contribution of budgetData.savingsContributions ?? []) {
    const paused = contribution.enabled === false;
    const typeLabel = contribution.type === 'investment' ? 'Investment' : 'Savings';
    const freqLabel = contribution.frequency
      ? contribution.frequency.charAt(0).toUpperCase() + contribution.frequency.slice(1)
      : '';
    results.push({
      id: `savings-${contribution.id}`,
      title: contribution.name,
      subtitle: `${formatAmount(contribution.amount, currency)} · ${freqLabel} · ${typeLabel}`,
      category: 'Savings',
      categoryIcon: '🏦',
      badge: paused ? 'Paused' : undefined,
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: contribution.accountId ? `account-${contribution.accountId}` : undefined,
      },
    });
  }

  // ── Retirement elections ──────────────────────────────────────────────────
  for (const election of budgetData.retirement ?? []) {
    const paused = election.enabled === false;
    const label =
      election.customLabel ||
      election.type.toUpperCase().replace('-', ' ');
    const contribLabel = election.employeeContributionIsPercentage
      ? `${election.employeeContribution}%`
      : formatAmount(election.employeeContribution, currency) + '/paycheck';
    results.push({
      id: `retirement-${election.id}`,
      title: label,
      subtitle: `Employee contribution: ${contribLabel}${election.hasEmployerMatch ? ' · Employer match' : ''}`,
      category: 'Retirement',
      categoryIcon: '🏖️',
      badge: paused ? 'Paused' : undefined,
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: 'retirement-section',
      },
    });
  }

  // ── Loans ─────────────────────────────────────────────────────────────────
  for (const loan of budgetData.loans ?? []) {
    const paused = loan.enabled === false;
    const typeLabel = loan.type
      ? loan.type.charAt(0).toUpperCase() + loan.type.slice(1).replace(/-/g, ' ')
      : '';
    results.push({
      id: `loan-${loan.id}`,
      title: loan.name,
      subtitle: `${formatAmount(loan.currentBalance, currency)} balance · ${typeLabel} · ${loan.interestRate}% APR`,
      category: 'Loans',
      categoryIcon: '💳',
      badge: paused ? 'Paused' : undefined,
      action: {
        type: 'navigate-tab',
        tabId: 'loans',
        elementId: loan.accountId ? `account-${loan.accountId}` : undefined,
      },
    });
  }

  // ── Accounts ──────────────────────────────────────────────────────────────
  for (const account of budgetData.accounts ?? []) {
    const typeLabel = account.type
      ? account.type.charAt(0).toUpperCase() + account.type.slice(1)
      : '';
    results.push({
      id: `account-${account.id}`,
      title: account.name,
      subtitle: typeLabel,
      category: 'Accounts',
      categoryIcon: '🏛️',
      action: { type: 'open-accounts', scrollToAccountId: account.id },
    });
  }

  // ── Settings shortcuts ────────────────────────────────────────────────────
  results.push(
    {
      id: 'settings-theme',
      title: 'Theme',
      subtitle: 'Light, dark, or system appearance',
      category: 'Settings',
      categoryIcon: '🎨',
      action: { type: 'open-settings' },
    },
    {
      id: 'settings-currency',
      title: 'Currency',
      subtitle: 'Change the display currency',
      category: 'Settings',
      categoryIcon: '💱',
      action: { type: 'open-settings' },
    },
    {
      id: 'settings-font',
      title: 'Font Scale',
      subtitle: 'Adjust text size',
      category: 'Settings',
      categoryIcon: '🔤',
      action: { type: 'open-settings' },
    },
  );

  return results;
}

// ─── Main search function ─────────────────────────────────────────────────────

/**
 * Search all plan data and return matching results.
 *
 * Supports:
 * - Substring / multi-token text search across title, subtitle, category
 * - Amount queries: ">500", "<1000", ">=250", "$500"
 *
 * Returns at most `maxResults` items (default 50).
 */
export function searchPlan(
  query: string,
  budgetData: BudgetData,
  maxResults = 50,
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const index = buildSearchIndex(budgetData);
  const amountQuery = parseAmountQuery(trimmed);

  const filtered = index.filter((result) => {
    if (amountQuery) {
      // For amount queries, only match items that have a numeric amount in their subtitle
      const amountMatch = result.subtitle?.match(/[\d,]+(?:\.\d+)?/);
      if (!amountMatch) return false;
      const amount = parseFloat(amountMatch[0].replace(/,/g, ''));
      return !isNaN(amount) && amountMatches(amount, amountQuery);
    }

    return matches(
      trimmed,
      result.title,
      result.subtitle,
      result.category,
      result.badge,
    );
  });

  return filtered.slice(0, maxResults);
}
