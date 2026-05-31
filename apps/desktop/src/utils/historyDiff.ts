/**
 * Utility for extracting and displaying diffs between audit history snapshots
 */

export interface FieldDiff {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface PaymentBreakdownDelta {
  kind: 'added' | 'removed' | 'changed';
  label: string;
  before?: string;
  after?: string;
}

export interface DiffResult {
  type: 'create' | 'update' | 'delete' | 'restore';
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

const formatTaxLines = (value: unknown): string => {
  if (!Array.isArray(value)) return formatDiffValue(value);
  if (value.length === 0) return '(empty)';

  const lines = value
    .filter((line) => line && typeof line === 'object')
    .map((line) => {
      const item = line as Record<string, unknown>;
      const label = typeof item.label === 'string' && item.label.length > 0 ? item.label : 'Tax line';
      const calculationType = item.calculationType === 'fixed' ? 'fixed' : 'percentage';

      if (calculationType === 'fixed') {
        const amount = typeof item.amount === 'number'
          ? item.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
          : formatDiffValue(item.amount);
        return `${label}: ${amount} fixed`;
      }

      const rate = typeof item.rate === 'number'
        ? item.rate.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : formatDiffValue(item.rate);
      return `${label}: ${rate}%`;
    });

  if (lines.length === 0) return '[Array]';
  return lines.join(' | ');
};

const toPaymentLineKey = (line: Record<string, unknown>): string => {
  if (typeof line.id === 'string' && line.id.length > 0) return line.id;
  const label = typeof line.label === 'string' ? line.label : 'line';
  const freq = typeof line.frequency === 'string' ? line.frequency : '';
  return `${label}:${freq}`;
};

const toPaymentLineValue = (line: Record<string, unknown>): string => {
  const amount = typeof line.amount === 'number'
    ? line.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : formatDiffValue(line.amount);
  const rawFreq = typeof line.frequency === 'string' ? line.frequency : '';
  const freq = rawFreq ? PAYMENT_FREQ_LABELS[rawFreq] ?? rawFreq : '';
  return freq ? `${amount} (${freq})` : `${amount}`;
};

/**
 * Build human-readable added/removed/changed rows for loan payment breakdown diffs.
 */
export const summarizePaymentBreakdownDiff = (
  oldValue: unknown,
  newValue: unknown,
): PaymentBreakdownDelta[] => {
  const oldLines = Array.isArray(oldValue)
    ? oldValue.filter((line) => line && typeof line === 'object') as Record<string, unknown>[]
    : [];
  const newLines = Array.isArray(newValue)
    ? newValue.filter((line) => line && typeof line === 'object') as Record<string, unknown>[]
    : [];

  const oldByKey = new Map(oldLines.map((line) => [toPaymentLineKey(line), line]));
  const newByKey = new Map(newLines.map((line) => [toPaymentLineKey(line), line]));

  const allKeys = new Set([...oldByKey.keys(), ...newByKey.keys()]);
  const deltas: PaymentBreakdownDelta[] = [];

  for (const key of allKeys) {
    const oldLine = oldByKey.get(key);
    const newLine = newByKey.get(key);

    if (!oldLine && newLine) {
      const label = typeof newLine.label === 'string' && newLine.label.length > 0 ? newLine.label : 'Line';
      deltas.push({
        kind: 'added',
        label,
        after: toPaymentLineValue(newLine),
      });
      continue;
    }

    if (oldLine && !newLine) {
      const label = typeof oldLine.label === 'string' && oldLine.label.length > 0 ? oldLine.label : 'Line';
      deltas.push({
        kind: 'removed',
        label,
        before: toPaymentLineValue(oldLine),
      });
      continue;
    }

    if (oldLine && newLine) {
      const before = toPaymentLineValue(oldLine);
      const after = toPaymentLineValue(newLine);
      const oldLabel = typeof oldLine.label === 'string' && oldLine.label.length > 0 ? oldLine.label : 'Line';
      const newLabel = typeof newLine.label === 'string' && newLine.label.length > 0 ? newLine.label : oldLabel;

      if (before !== after || oldLabel !== newLabel) {
        deltas.push({
          kind: 'changed',
          label: newLabel,
          before,
          after,
        });
      }
    }
  }

  return deltas;
};

/**
 * Format a value for display with field-specific handling.
 */
export const formatDiffValueForField = (key: string, value: unknown): string => {
  if (key === 'paymentBreakdown') {
    return formatPaymentBreakdown(value);
  }
  if (key === 'taxLines') {
    return formatTaxLines(value);
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
  taxLines: 'Tax Lines',
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

/** Allocation-item fields that are internal metadata/noise in timeline diffs. */
export const ALLOCATION_NOISE_FIELDS = new Set([
  'id',
  'accountId',
  'isBill',
  'billCount',
  'isBenefit',
  'benefitCount',
  'isRetirement',
  'retirementCount',
  'isLoan',
  'loanCount',
  'isSavings',
  'savingsCount',
]);

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
