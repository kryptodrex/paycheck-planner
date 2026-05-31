import { getPayFrequencyOccurrencesPerYear } from './frequency';
import type { PayFrequency } from './frequency';

export type ViewMode = 'paycheck' | PayFrequency;
export type SelectableViewMode = Exclude<ViewMode, 'paycheck'>;

export interface PaySettingsLike {
  payType: 'salary' | 'hourly';
  annualSalary?: number;
  hourlyRate?: number;
  hoursPerPayPeriod?: number;
  payFrequency: PayFrequency | string;
}

/**
 * Get the number of paychecks per year based on pay frequency.
 */
export function getPaychecksPerYear(frequency: PayFrequency | string): number {
  return getPayFrequencyOccurrencesPerYear(String(frequency));
}

export function getPayFrequencyViewMode(frequency: PayFrequency | string): ViewMode {
  const PAY_FREQUENCY_TO_VIEW_MODE: Record<PayFrequency, ViewMode> = {
    weekly: 'weekly',
    'bi-weekly': 'bi-weekly',
    'semi-monthly': 'semi-monthly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  };
  return PAY_FREQUENCY_TO_VIEW_MODE[frequency as PayFrequency] ?? 'bi-weekly';
}

const VIEW_MODE_OCCURRENCES_PER_YEAR: Record<SelectableViewMode, number> = {
  weekly: 52,
  'bi-weekly': 26,
  'semi-monthly': 24,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function getDisplayModeOccurrencesPerYear(
  displayMode: ViewMode,
  paychecksPerYear: number,
): number {
  if (displayMode === 'paycheck') return paychecksPerYear;
  return VIEW_MODE_OCCURRENCES_PER_YEAR[displayMode as SelectableViewMode] ?? paychecksPerYear;
}

export function convertToDisplayMode(
  paycheckAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode,
): number {
  const roundToCent = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const displayOccurrences = getDisplayModeOccurrencesPerYear(displayMode, paychecksPerYear);
  return roundToCent((paycheckAmount * paychecksPerYear) / displayOccurrences);
}

function roundForStoredAmount(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1_000_000_000_000) / 1_000_000_000_000;
}

export function convertFromDisplayMode(
  displayAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode,
): number {
  const displayOccurrences = getDisplayModeOccurrencesPerYear(displayMode, paychecksPerYear);
  return roundForStoredAmount((displayAmount * displayOccurrences) / paychecksPerYear);
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  paycheck: 'Per Paycheck',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'semi-monthly': 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function getDisplayModeLabel(displayMode: ViewMode): string {
  return VIEW_MODE_LABELS[displayMode] ?? 'Per Paycheck';
}

const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'semi-monthly': 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function formatPayFrequencyLabel(frequency: PayFrequency | string): string {
  return PAY_FREQUENCY_LABELS[frequency as PayFrequency] ?? 'Bi-weekly';
}

export function calculateGrossPayPerPaycheck(paySettings: PaySettingsLike): number {
  if (paySettings.payType === 'salary') {
    const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
    return (paySettings.annualSalary || 0) / paychecksPerYear;
  }

  return (paySettings.hourlyRate || 0) * (paySettings.hoursPerPayPeriod || 0);
}

export function calculateGrossPayPerYear(paySettings: PaySettingsLike): number {
  if (paySettings.payType === 'salary') {
    return paySettings.annualSalary || 0;
  }

  return (
    (paySettings.hourlyRate || 0) *
    (paySettings.hoursPerPayPeriod || 0) *
    getPaychecksPerYear(paySettings.payFrequency)
  );
}
