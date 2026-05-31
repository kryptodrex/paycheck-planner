/**
 * Single source of truth for all dashboard tab identifiers.
 * Derive the TabId union type from this object so that adding a new tab only
 * requires one entry here — the type and all typed consumers update automatically.
 */
export const TAB_IDS = {
  metrics: 'metrics',
  breakdown: 'breakdown',
  otherIncome: 'other-income',
  bills: 'bills',
  loans: 'loans',
  savings: 'savings',
  taxes: 'taxes',
} as const;

export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS];
