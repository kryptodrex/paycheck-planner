/**
 * Plan-wide search utility
 *
 * Indexes all data in an open BudgetData plan and returns ranked, navigable
 * search results.  Results carry a typed `action` that callers use to navigate
 * the user to the matching item (switch tab, scroll to element, open a modal, etc.).
 */

import type { BudgetData } from '../types/budget';
import { calculateAnnualizedPaySummary, calculatePaycheckBreakdown } from '../services/budgetCalculations';
import { convertBillToYearly } from './billFrequency';
import { getPaychecksPerYear } from './payPeriod';
import type { TabId } from './tabManagement';
import { getAllSearchResults } from './searchRegistry';

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

/** Open the app Settings modal, optionally scrolling to a specific section. */
export interface OpenSettingsAction {
  type: 'open-settings';
  /** Section id to scroll into view: 'appearance' | 'accessibility' | 'glossary' | 'app-data-reset' */
  sectionId?: string;
}

/** Open Bills tab and trigger an action such as opening add-item modals. */
export interface OpenBillsAction {
  type: 'open-bills-action';
  mode:
    | 'add-bill'
    | 'add-deduction'
    | 'edit-bill'
    | 'delete-bill'
    | 'toggle-bill'
    | 'edit-benefit'
    | 'delete-benefit'
    | 'toggle-benefit';
  targetId?: string;
}

/** Open Loans tab and trigger an action such as opening add/edit modals. */
export interface OpenLoansAction {
  type: 'open-loans-action';
  mode: 'add-loan' | 'edit-loan' | 'delete-loan' | 'toggle-loan';
  targetId?: string;
}

/** Open Savings tab and trigger savings/retirement actions. */
export interface OpenSavingsAction {
  type: 'open-savings-action';
  mode:
    | 'add-contribution'
    | 'add-retirement'
    | 'edit-savings'
    | 'delete-savings'
    | 'toggle-savings'
    | 'edit-retirement'
    | 'delete-retirement'
    | 'toggle-retirement';
  targetId?: string;
}

/** Open Tax tab and optionally open tax settings modal. */
export interface OpenTaxesAction {
  type: 'open-taxes-action';
  mode: 'open-settings';
}

export type SearchResultAction =
  | NavigateTabAction
  | OpenPaySettingsAction
  | OpenAccountsAction
  | OpenSettingsAction
  | OpenBillsAction
  | OpenLoansAction
  | OpenSavingsAction
  | OpenTaxesAction;

export interface SearchInlineAction {
  id: string;
  label: string;
  action: SearchResultAction;
  variant?: 'default' | 'danger';
}

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
  /** Inline action buttons shown directly on an item result row. */
  inlineActions?: SearchInlineAction[];
  /** Extra keywords used only for matching (not shown in UI). */
  searchKeywords?: string[];
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

  // ── Key Metrics cards ────────────────────────────────────────────────────
  results.push(
    {
      id: 'key-metrics-total-income',
      title: 'Total Income',
      subtitle: `${formatAmount(annualizedSummary.annualGross, currency)} yearly`,
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
      subtitle: `${formatAmount(annualizedSummary.annualTaxes, currency)} yearly`,
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
      subtitle: `${formatAmount(annualBills, currency)} yearly`,
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
      subtitle: `${formatAmount(annualizedSummary.annualNet, currency)} yearly`,
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
      subtitle: `${formatAmount(annualRemainingForSpending, currency)} yearly`,
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
  );

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
      subtitle: formatAmount(pay.hourlyRate, currency) + '/hr',
      category: 'Pay Settings',
      categoryIcon: '⏱️',
      action: { type: 'open-pay-settings', fieldHighlight: 'hourlyRate' },
    });
  }

  // ── Quick actions (header/primary buttons) ───────────────────────────────
  results.push(
    {
      id: 'quick-action-add-bill',
      title: 'Add Bill',
      subtitle: 'Open Bills & Expenses and start adding a bill',
      category: 'Quick Actions',
      categoryIcon: '➕',
      action: { type: 'open-bills-action', mode: 'add-bill' },
    },
    {
      id: 'quick-action-add-deduction',
      title: 'Add Deduction',
      subtitle: 'Open Bills & Expenses and start adding a deduction',
      category: 'Quick Actions',
      categoryIcon: '➕',
      action: { type: 'open-bills-action', mode: 'add-deduction' },
    },
    {
      id: 'quick-action-add-loan-payment',
      title: 'Add Loan Payment',
      subtitle: 'Open Loan Payments and start adding a payment',
      category: 'Quick Actions',
      categoryIcon: '➕',
      action: { type: 'open-loans-action', mode: 'add-loan' },
    },
    {
      id: 'quick-action-add-contribution',
      title: 'Add Contribution',
      subtitle: 'Open Savings and start adding a savings/investment contribution',
      category: 'Quick Actions',
      categoryIcon: '➕',
      action: { type: 'open-savings-action', mode: 'add-contribution' },
    },
    {
      id: 'quick-action-add-retirement-plan',
      title: 'Add Retirement Plan',
      subtitle: 'Open Savings and start adding a retirement plan',
      category: 'Quick Actions',
      categoryIcon: '➕',
      action: { type: 'open-savings-action', mode: 'add-retirement' },
    },
    {
      id: 'quick-action-edit-tax-settings',
      title: 'Edit Tax Settings',
      subtitle: 'Open Tax Breakdown and launch the tax settings modal',
      category: 'Quick Actions',
      categoryIcon: '⚙️',
      action: { type: 'open-taxes-action', mode: 'open-settings' },
    },
  );

  // ── Pay Breakdown sections ───────────────────────────────────────────────
  results.push(
    {
      id: 'pay-breakdown-gross-pay',
      title: 'Gross Pay',
      subtitle: `${formatAmount(paycheckBreakdown.grossPay, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: '💸',
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-gross-pay',
      },
    },
    {
      id: 'pay-breakdown-total-taxes',
      title: 'Total Taxes',
      subtitle: `${formatAmount(paycheckBreakdown.totalTaxes, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: '🏛️',
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-total-taxes',
      },
    },
    {
      id: 'pay-breakdown-taxable-income',
      title: 'Taxable Income',
      subtitle: `${formatAmount(paycheckBreakdown.taxableIncome, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: '🧮',
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
            subtitle: `${formatAmount(paycheckBreakdown.preTaxDeductions, currency)} per paycheck`,
            category: 'Pay Breakdown',
            categoryIcon: '📉',
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
            subtitle: `${formatAmount(postTaxDeductionsAmount, currency)} per paycheck`,
            category: 'Pay Breakdown',
            categoryIcon: '📌',
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
      subtitle: `${formatAmount(paycheckBreakdown.netPay, currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: '✅',
      action: {
        type: 'navigate-tab',
        tabId: 'breakdown',
        elementId: 'pay-breakdown-net-pay',
      },
    },
    {
      id: 'pay-breakdown-remaining-for-spending',
      title: 'All That Remains for Spending',
      subtitle: `${formatAmount(Math.max(annualRemainingForSpending / Math.max(paychecksPerYear, 1), 0), currency)} per paycheck`,
      category: 'Pay Breakdown',
      categoryIcon: '💵',
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
            categoryIcon: '🧾',
            action: {
              type: 'navigate-tab' as const,
              tabId: 'breakdown' as const,
              elementId: 'pay-breakdown-after-tax-allocations',
            },
          },
        ]
      : []),
  );

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

  // ── Registered search modules ────────────────────────────────────────────
  // Each search module (bills, loans, savings, taxes, etc.) contributes results via registry.
  // This keeps the search system extensible and decoupled from core search logic.
  results.push(...getAllSearchResults(budgetData));

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
      action: { type: 'navigate-tab', tabId: 'taxes', elementId: `tax-line-${line.id}` },
    });
  }

  if ((budgetData.taxSettings?.additionalWithholding ?? 0) > 0) {
    results.push({
      id: 'tax-additional-withholding',
      title: 'Additional Withholding',
      subtitle: formatAmount(budgetData.taxSettings?.additionalWithholding ?? 0, currency) + ' per paycheck',
      category: 'Tax',
      categoryIcon: '🏛️',
      action: { type: 'navigate-tab', tabId: 'taxes', elementId: 'tax-additional-withholding-row' },
    });
  }

  results.push({
    id: 'tax-total-taxes',
    title: 'Total Taxes',
    subtitle: formatAmount(paycheckBreakdown.totalTaxes, currency) + ' per paycheck',
    category: 'Tax',
    categoryIcon: '🏛️',
    action: { type: 'navigate-tab', tabId: 'taxes', elementId: 'tax-total-taxes-row' },
  });



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
      inlineActions: [
        {
          id: `toggle-savings-${contribution.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-savings-action', mode: 'toggle-savings', targetId: contribution.id },
        },
        {
          id: `edit-savings-${contribution.id}`,
          label: 'Edit',
          action: { type: 'open-savings-action', mode: 'edit-savings', targetId: contribution.id },
        },
        {
          id: `delete-savings-${contribution.id}`,
          label: 'Delete',
          action: { type: 'open-savings-action', mode: 'delete-savings', targetId: contribution.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['savings', 'contribution', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: `savings-${contribution.id}`,
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
      inlineActions: [
        {
          id: `toggle-retirement-${election.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-savings-action', mode: 'toggle-retirement', targetId: election.id },
        },
        {
          id: `edit-retirement-${election.id}`,
          label: 'Edit',
          action: { type: 'open-savings-action', mode: 'edit-retirement', targetId: election.id },
        },
        {
          id: `delete-retirement-${election.id}`,
          label: 'Delete',
          action: { type: 'open-savings-action', mode: 'delete-retirement', targetId: election.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['retirement', 'plan', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'savings',
        elementId: `retirement-${election.id}`,
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
      inlineActions: [
        {
          id: `toggle-loan-${loan.id}`,
          label: paused ? 'Resume' : 'Pause',
          action: { type: 'open-loans-action', mode: 'toggle-loan', targetId: loan.id },
        },
        {
          id: `edit-loan-${loan.id}`,
          label: 'Edit',
          action: { type: 'open-loans-action', mode: 'edit-loan', targetId: loan.id },
        },
        {
          id: `delete-loan-${loan.id}`,
          label: 'Delete',
          action: { type: 'open-loans-action', mode: 'delete-loan', targetId: loan.id },
          variant: 'danger',
        },
      ],
      searchKeywords: ['loan', 'payment', 'pause', 'resume', 'edit', 'delete'],
      action: {
        type: 'navigate-tab',
        tabId: 'loans',
        elementId: `loan-${loan.id}`,
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

  // ── Settings entries ──────────────────────────────────────────────────────
  // sectionId values must match the SETTINGS_SECTIONS ids defined in SettingsModal.tsx:
  //   'appearance' | 'accessibility' | 'glossary' | 'app-data-reset'

  // ── Settings — Appearance ─────────────────────────────────────────────────
  results.push(
    {
      id: 'settings-theme',
      title: 'Theme',
      subtitle: 'Switch between light, dark, or system appearance',
      category: 'Settings',
      categoryIcon: '🎨',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-preset',
      title: 'Appearance Preset',
      subtitle: 'Choose a color preset: Purple, Ocean, Forest, Sunset, Slate, Rose',
      category: 'Settings',
      categoryIcon: '🖌️',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-light',
      title: 'Light Mode',
      subtitle: 'Switch to light theme',
      category: 'Settings',
      categoryIcon: '☀️',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-dark',
      title: 'Dark Mode',
      subtitle: 'Switch to dark theme',
      category: 'Settings',
      categoryIcon: '🌙',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-system',
      title: 'System Theme',
      subtitle: 'Follow the operating system appearance preference',
      category: 'Settings',
      categoryIcon: '💻',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
  );

  // ── Settings — Accessibility ───────────────────────────────────────────────
  results.push(
    {
      id: 'settings-font-scale',
      title: 'Font Scale',
      subtitle: 'Adjust text size for readability',
      category: 'Settings',
      categoryIcon: '🔤',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
    {
      id: 'settings-high-contrast',
      title: 'High Contrast Mode',
      subtitle: 'Increase color contrast for accessibility',
      category: 'Settings',
      categoryIcon: '🔲',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
    {
      id: 'settings-accessibility',
      title: 'Accessibility',
      subtitle: 'Font scale, high contrast, readability options',
      category: 'Settings',
      categoryIcon: '♿',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
  );

  // ── Settings — Glossary ───────────────────────────────────────────────────
  results.push(
    {
      id: 'settings-glossary',
      title: 'Glossary Terms',
      subtitle: 'Enable or disable inline term definitions and hover tooltips',
      category: 'Settings',
      categoryIcon: '📖',
      action: { type: 'open-settings', sectionId: 'glossary' },
    },
    {
      id: 'settings-tooltips',
      title: 'Tooltips',
      subtitle: 'Show or hide inline glossary term tooltips',
      category: 'Settings',
      categoryIcon: '💬',
      action: { type: 'open-settings', sectionId: 'glossary' },
    },
  );

  // ── Settings — App Data & View Modes ──────────────────────────────────────
  results.push(
    {
      id: 'settings-view-mode',
      title: 'View Mode Favorites',
      subtitle: 'Choose which cadence views appear in the selector: weekly, bi-weekly, monthly…',
      category: 'Settings',
      categoryIcon: '📊',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-weekly',
      title: 'Weekly View',
      subtitle: 'Show amounts on a weekly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-biweekly',
      title: 'Bi-weekly View',
      subtitle: 'Show amounts on a bi-weekly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-monthly',
      title: 'Monthly View',
      subtitle: 'Show amounts on a monthly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-backup',
      title: 'Backup & Export Settings',
      subtitle: 'Export or import app settings as a backup',
      category: 'Settings',
      categoryIcon: '💾',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-reset',
      title: 'Reset App Data',
      subtitle: 'Clear all app settings and restore defaults',
      category: 'Settings',
      categoryIcon: '🔄',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
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
      result.inlineActions?.map((action) => action.label).join(' '),
      result.searchKeywords?.join(' '),
    );
  });

  return filtered.slice(0, maxResults);
}
