/**
 * Search Registry
 *
 * A registry-based system for extending search functionality without modifying core search logic.
 * Each feature (Bills, Loans, Taxes, etc.) can register itself with:
 *   1. A result source function that contributes SearchResults given a BudgetData
 *   2. Action handlers that process search result actions (navigate, toggle, edit, etc.)
 *
 * This enables:
 * - Easy addition of new searchable features
 * - Decoupled action handling per feature
 * - Custom tabs to self-register without modifying core files
 * - Cleaner separation of concerns
 */

import type { BudgetData } from '../types/budget';
import type { SearchResult, SearchResultAction } from './planSearch';

/**
 * Context passed to action handlers so they can dispatch state changes.
 * This is designed to be compatible with PlanDashboard's state setters.
 * Each setter is a React setState function that accepts either a value or updater function.
 */
export interface SearchActionContext {
  // Bills/Benefits/Deductions actions
  setPendingBillsSearchAction?: (action: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setPendingBillsSearchTargetId?: (id: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setBillsSearchRequestKey?: (key: number | ((prev: number) => number)) => void;

  // Loans actions
  setPendingLoansSearchAction?: (action: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setPendingLoansSearchTargetId?: (id: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setLoansSearchRequestKey?: (key: number | ((prev: number) => number)) => void;

  // Savings/Retirement actions
  setPendingSavingsSearchAction?: (action: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setPendingSavingsSearchTargetId?: (id: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setSavingsSearchRequestKey?: (key: number | ((prev: number) => number)) => void;

  // Tax actions
  setTaxSearchOpenSettingsRequestKey?: (key: number | ((prev: number) => number)) => void;

  // General navigation/modals
  selectTab?: (tabId: string, options?: {
    resetBillsAnchor?: boolean;
    scrollToAccountId?: string;
    scrollToRetirement?: boolean;
    revealIfHidden?: boolean;
  }) => void;
  setScrollToAccountId?: (id: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
  setShowAccountsModal?: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowSettings?: (show: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsInitialSection?: (section: string | undefined | ((prev: string | undefined) => string | undefined)) => void;

  // Search-result highlight and scroll
  onNavigate?: (result: SearchResult) => void;
  onClose?: () => void;
}

/**
 * A search module contributes results and handles actions for a feature.
 * Modules are self-contained: they own their category, result building, and action handling.
 */
export interface SearchModule {
  /** Unique identifier for this module (e.g., 'bills', 'loans', 'taxes') */
  id: string;

  /**
   * Builds and returns search results for this module given budget data.
   * Should return an empty array if the data does not contain relevant items.
   */
  buildResults: (budgetData: BudgetData) => SearchResult[];

  /**
   * Handlers for action types produced by this module.
   * Key is the action.type (e.g., 'open-bills-action').
   * Value is the handler function that processes the action and updates state via context.
   */
  actionHandlers: Record<string, (action: SearchResultAction, context: SearchActionContext) => void>;
}

/** Global registry of search modules */
const registry = new Map<string, SearchModule>();

/**
 * Register a search module.
 * Call this once per module at app initialization.
 */
export function registerSearchModule(module: SearchModule): void {
  if (registry.has(module.id)) {
    console.warn(`Search module '${module.id}' is already registered. Replacing it.`);
  }
  registry.set(module.id, module);
}

/**
 * Unregister a search module.
 * Useful for testing or hot reload scenarios.
 */
export function unregisterSearchModule(id: string): void {
  registry.delete(id);
}

/**
 * Get all registered search results by invoking each module's buildResults.
 * Should be called by buildSearchIndex in planSearch.ts.
 */
export function getAllSearchResults(budgetData: BudgetData): SearchResult[] {
  const allResults: SearchResult[] = [];
  for (const module of registry.values()) {
    allResults.push(...module.buildResults(budgetData));
  }
  return allResults;
}

/**
 * Get the handler for a specific action type.
 * Searches all registered modules for a handler matching action.type.
 */
export function getActionHandler(
  actionType: string,
): ((action: SearchResultAction, context: SearchActionContext) => void) | undefined {
  for (const module of registry.values()) {
    if (module.actionHandlers[actionType]) {
      return module.actionHandlers[actionType];
    }
  }
  return undefined;
}

/**
 * Get all registered modules (mainly for testing/debugging).
 */
export function getRegisteredModules(): SearchModule[] {
  return Array.from(registry.values());
}

/**
 * Clear all registered modules (mainly for testing).
 */
export function clearRegistry(): void {
  registry.clear();
}
