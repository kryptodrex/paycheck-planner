import type { BillFrequency, CoreFrequency, PayFrequency, SavingsFrequency } from '../types/auth';

export function normalizeFrequencyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

type FrequencyAlias =
  | 'biweekly'
  | 'semimonthly'
  | 'twice-monthly'
  | 'twice-a-month'
  | 'semiannual'
  | 'annual'
  | 'annually';

type FrequencyToken = CoreFrequency | 'quarterly' | 'semi-annual' | 'custom' | FrequencyAlias;

const PAY_FREQUENCY_OCCURRENCES: Partial<Record<FrequencyToken, number>> = {
  weekly: 52,
  'bi-weekly': 26,
  biweekly: 26,
  'semi-monthly': 24,
  semimonthly: 24,
  'twice-monthly': 24,
  'twice-a-month': 24,
  monthly: 12,
};

const BILL_FREQUENCY_OCCURRENCES: Partial<Record<FrequencyToken, number>> = {
  weekly: 52,
  'bi-weekly': 26,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  semiannual: 2,
  yearly: 1,
  annual: 1,
  annually: 1,
};

const SAVINGS_FREQUENCY_OCCURRENCES: Partial<Record<FrequencyToken, number>> = {
  weekly: 52,
  'bi-weekly': 26,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  semiannual: 2,
  yearly: 1,
  annual: 1,
  annually: 1,
};

function resolveOccurrences(
  frequency: string,
  occurrencesMap: Partial<Record<FrequencyToken, number>>,
  defaultOccurrences: number
): number {
  const normalized = normalizeFrequencyToken(frequency) as FrequencyToken;
  return occurrencesMap[normalized] ?? defaultOccurrences;
}

export function getPayFrequencyOccurrencesPerYear(frequency: PayFrequency | string): number {
  return resolveOccurrences(frequency, PAY_FREQUENCY_OCCURRENCES, 26);
}

/**
 * Returns the number of billing occurrences per year for a given frequency.
 * For 'custom' frequency, customDays represents the custom billing period in days
 * (e.g., 10 means every 10 days = 365/10 = 36.5 occurrences per year).
 * When customDays is not provided, falls back to 1 (yearly) as the default.
 */
export function getBillFrequencyOccurrencesPerYear(frequency: BillFrequency | string, customDays?: number): number {
  if (normalizeFrequencyToken(frequency) === 'custom') {
    return customDays ? 365 / customDays : 1;
  }

  return resolveOccurrences(frequency, BILL_FREQUENCY_OCCURRENCES, 1);
}

export function getSavingsFrequencyOccurrencesPerYear(frequency: SavingsFrequency | string): number {
  return resolveOccurrences(frequency, SAVINGS_FREQUENCY_OCCURRENCES, 12);
}
