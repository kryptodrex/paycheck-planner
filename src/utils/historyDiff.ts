/**
 * Utility for extracting and displaying diffs between audit history snapshots
 */

export interface FieldDiff {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface DiffResult {
  type: 'create' | 'update' | 'delete';
  fields: FieldDiff[];
  snapshot: unknown;
}

/**
 * Extract changed fields from two snapshots (for update operations)
 */
export const extractFieldDiffs = (prevSnapshot: unknown, nextSnapshot: unknown): FieldDiff[] => {
  const diffs: FieldDiff[] = [];

  if (!prevSnapshot || typeof prevSnapshot !== 'object' || !nextSnapshot || typeof nextSnapshot !== 'object') {
    return diffs;
  }

  const prevObj = prevSnapshot as Record<string, unknown>;
  const nextObj = nextSnapshot as Record<string, unknown>;

  // Find changed fields
  const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]);
  for (const key of allKeys) {
    const prev = prevObj[key];
    const next = nextObj[key];
    const prevStr = JSON.stringify(prev);
    const nextStr = JSON.stringify(next);

    if (prevStr !== nextStr) {
      diffs.push({ key, oldValue: prev, newValue: next });
    }
  }

  return diffs;
};

/**
 * Format a value for display in diffs
 */
export const formatDiffValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  if (typeof value === 'string') {
    return value.length > 0 ? value : '(empty)';
  }

  if (Array.isArray(value)) {
    return `[Array: ${value.length} items]`;
  }

  if (typeof value === 'object') {
    return '[Object]';
  }

  return String(value);
};

const PAYMENT_FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-Weekly',
  'semi-monthly': 'Semi-Monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'semi-annual': 'Semi-Annual',
  yearly: 'Yearly',
};

const formatPaymentBreakdown = (value: unknown): string => {
  if (!Array.isArray(value)) return formatDiffValue(value);
  if (value.length === 0) return '(empty)';

  const lines = value
    .filter((line) => line && typeof line === 'object')
    .map((line) => {
      const item = line as Record<string, unknown>;
      const label = typeof item.label === 'string' && item.label.length > 0 ? item.label : 'Line';
      const amount = typeof item.amount === 'number' ? item.amount.toLocaleString('en-US', { maximumFractionDigits: 2 }) : formatDiffValue(item.amount);
      const rawFreq = typeof item.frequency === 'string' ? item.frequency : '';
      const freq = rawFreq ? PAYMENT_FREQ_LABELS[rawFreq] ?? rawFreq : '';
      return freq ? `${label}: ${amount} (${freq})` : `${label}: ${amount}`;
    });

  if (lines.length === 0) return '[Array]';
  return lines.join(' | ');
};

/**
 * Format a value for display with field-specific handling.
 */
export const formatDiffValueForField = (key: string, value: unknown): string => {
  if (key === 'paymentBreakdown') {
    return formatPaymentBreakdown(value);
  }
  return formatDiffValue(value);
};

/** Override display names for known noisy field keys */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  accountId: 'Account',
  sourceAccountId: 'Source Account',
  employeeContribution: 'Contribution',
  employeeContributionIsPercentage: 'Contribution Is %',
  hasEmployerMatch: 'Employer Match',
  employerMatchPercentage: 'Employer Match %',
  isPreTax: 'Pre-Tax',
  isTaxable: 'Taxable',
  isPercentage: 'Is %',
  monthlyPayment: 'Monthly Payment',
  currentBalance: 'Balance',
  interestRate: 'Interest Rate',
  paymentFrequency: 'Payment Frequency',
  deductionSource: 'Deduction Source',
};

/**
 * Convert field name from camelCase to Title Case
 */
export const formatFieldName = (key: string): string => {
  if (key in FIELD_DISPLAY_NAMES) return FIELD_DISPLAY_NAMES[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/** Fields whose values are entity IDs that should be resolved to display names */
export const ID_FIELD_KEYS = new Set(['accountId', 'sourceAccountId']);

/**
 * Get a user-friendly summary of the snapshot
 */
export const getSummaryFields = (snapshot: unknown, maxFields: number = 3): string[] => {
  if (!snapshot || typeof snapshot !== 'object') {
    return [];
  }

  const obj = snapshot as Record<string, unknown>;
  const summaryKeys = ['label', 'name', 'title', 'description', 'amount', 'percentage', 'rate'];

  const included: string[] = [];
  for (const key of summaryKeys) {
    if (key in obj && included.length < maxFields) {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        included.push(`${formatFieldName(key)}: ${formatDiffValue(value)}`);
      }
    }
  }

  return included;
};
