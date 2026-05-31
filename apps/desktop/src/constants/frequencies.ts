/**
 * Master frequency constants. Every frequency value used across the app lives here.
 * Per-type subsets are derived via `Exclude` in src/types/frequencies.ts.
 */
export const FREQUENCIES = {
  weekly: 'weekly',
  biWeekly: 'bi-weekly',
  semiMonthly: 'semi-monthly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  semiAnnual: 'semi-annual',
  yearly: 'yearly',
  custom: 'custom',
} as const;

export type AnyFrequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

export const VIEW_MODES = {
  paycheck: 'paycheck',
  weekly: 'weekly',
  biWeekly: 'bi-weekly',
  semiMonthly: 'semi-monthly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  yearly: 'yearly',
} as const;

/**
 * All selectable view modes (excludes 'paycheck' which is used as a legacy alias).
 */
export const SELECTABLE_VIEW_MODES = [
  VIEW_MODES.weekly,
  VIEW_MODES.biWeekly,
  VIEW_MODES.semiMonthly,
  VIEW_MODES.monthly,
  VIEW_MODES.quarterly,
  VIEW_MODES.yearly,
] as const;

// ---------------------------------------------------------------------------
// Shared dropdown option arrays
// ---------------------------------------------------------------------------

/** Options for pay frequency selectors (PayFrequency). */
export const PAY_FREQUENCY_OPTIONS = [
  { value: FREQUENCIES.weekly, label: 'Weekly' },
  { value: FREQUENCIES.biWeekly, label: 'Bi-weekly' },
  { value: FREQUENCIES.semiMonthly, label: 'Semi-monthly' },
  { value: FREQUENCIES.monthly, label: 'Monthly' },
  { value: FREQUENCIES.quarterly, label: 'Quarterly' },
  { value: FREQUENCIES.yearly, label: 'Yearly' },
] as const;

/**
 * Options for loan payment frequency selectors (LoanPaymentFrequency).
 * Also imported by BillsManager and SavingsManager since they share the same set.
 */
export const LOAN_PAYMENT_FREQUENCY_OPTIONS = [
  { value: FREQUENCIES.weekly, label: 'Weekly' },
  { value: FREQUENCIES.biWeekly, label: 'Bi-weekly' },
  { value: FREQUENCIES.monthly, label: 'Monthly' },
  { value: FREQUENCIES.quarterly, label: 'Quarterly' },
  { value: FREQUENCIES.semiAnnual, label: 'Semi-annual' },
  { value: FREQUENCIES.yearly, label: 'Yearly' },
] as const;

/** Options for other income frequency selectors (CoreFrequency subset). */
export const OTHER_INCOME_FREQUENCY_OPTIONS = [
  { value: FREQUENCIES.weekly, label: 'Weekly' },
  { value: FREQUENCIES.biWeekly, label: 'Bi-weekly' },
  { value: FREQUENCIES.semiMonthly, label: 'Semi-monthly' },
  { value: FREQUENCIES.monthly, label: 'Monthly' },
] as const;
