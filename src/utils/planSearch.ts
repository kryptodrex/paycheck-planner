/**
 * Plan-wide search utility
 *
 * Indexes all data in an open BudgetData plan and returns ranked, navigable
 * search results.  Results carry a typed `action` that callers use to navigate
 * the user to the matching item (switch tab, scroll to element, open a modal, etc.).
 */

import type { BudgetData } from '../types/budget';
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

/**
 * Build a flat list of all searchable items from the plan.
 * This is intentionally exhaustive — the caller filters by query.
 */
export function buildSearchIndex(budgetData: BudgetData): SearchResult[] {
  const results: SearchResult[] = [];
  const currency = budgetData.settings?.currency ?? 'USD';

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
