/**
 * Utility functions for pay period conversions and display modes
 * These functions help convert between different time periods (paycheck, monthly, yearly)
 */

import type { PayFrequency } from '../types/frequencies';
import type { PaySettings } from '../types/payroll';
import type { SelectableViewMode, ViewMode } from '../types/viewMode';
import { FREQUENCIES, VIEW_MODES } from '../constants/frequencies';
import { getPayFrequencyOccurrencesPerYear } from './frequency';

/**
 * Get the number of paychecks per year based on pay frequency
 * @param frequency - The pay frequency ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')
 * @returns Number of paychecks per year
 */
export function getPaychecksPerYear(frequency: PayFrequency | string): number {
  return getPayFrequencyOccurrencesPerYear(String(frequency));
}

export function getPayFrequencyViewMode(frequency: PayFrequency | string): ViewMode {
  const PAY_FREQUENCY_TO_VIEW_MODE: Record<PayFrequency, ViewMode> = {
    [FREQUENCIES.weekly]: VIEW_MODES.weekly,
    [FREQUENCIES.biWeekly]: VIEW_MODES.biWeekly,
    [FREQUENCIES.semiMonthly]: VIEW_MODES.semiMonthly,
    [FREQUENCIES.monthly]: VIEW_MODES.monthly,
    [FREQUENCIES.quarterly]: VIEW_MODES.quarterly,
    [FREQUENCIES.yearly]: VIEW_MODES.yearly,
  };
  return PAY_FREQUENCY_TO_VIEW_MODE[frequency as PayFrequency] ?? VIEW_MODES.biWeekly;
}

/**
 * Convert a per-paycheck amount to the specified display mode
 * @param paycheckAmount - Amount per paycheck
 * @param paychecksPerYear - Number of paychecks per year (from getPaychecksPerYear)
 * @param displayMode - The display mode
 * @returns Converted amount in the requested display mode
 */
const VIEW_MODE_OCCURRENCES_PER_YEAR: Record<SelectableViewMode, number> = {
  [VIEW_MODES.weekly]: 52,
  [VIEW_MODES.biWeekly]: 26,
  [VIEW_MODES.semiMonthly]: 24,
  [VIEW_MODES.monthly]: 12,
  [VIEW_MODES.quarterly]: 4,
  [VIEW_MODES.yearly]: 1,
};

export function getDisplayModeOccurrencesPerYear(
  displayMode: ViewMode,
  paychecksPerYear: number,
): number {
  if (displayMode === VIEW_MODES.paycheck) return paychecksPerYear;
  return VIEW_MODE_OCCURRENCES_PER_YEAR[displayMode as SelectableViewMode] ?? paychecksPerYear;
}

export function convertToDisplayMode(
  paycheckAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode
): number {
  const roundToCent = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const displayOccurrences = getDisplayModeOccurrencesPerYear(displayMode, paychecksPerYear);
  return roundToCent((paycheckAmount * paychecksPerYear) / displayOccurrences);
}

function roundForStoredAmount(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1_000_000_000_000) / 1_000_000_000_000;
}

/**
 * Convert a display mode amount back to per-paycheck amount
 * @param displayAmount - Amount in the display mode
 * @param paychecksPerYear - Number of paychecks per year (from getPaychecksPerYear)
 * @param displayMode - The display mode
 * @returns Amount per paycheck
 */
export function convertFromDisplayMode(
  displayAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode
): number {
  const displayOccurrences = getDisplayModeOccurrencesPerYear(displayMode, paychecksPerYear);
  return roundForStoredAmount((displayAmount * displayOccurrences) / paychecksPerYear);
}

/**
 * Get the human-readable label for a display mode
 * @param displayMode - The display mode
 * @returns Human-readable label
 */
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  [VIEW_MODES.paycheck]: 'Per Paycheck',
  [VIEW_MODES.weekly]: 'Weekly',
  [VIEW_MODES.biWeekly]: 'Bi-weekly',
  [VIEW_MODES.semiMonthly]: 'Semi-monthly',
  [VIEW_MODES.monthly]: 'Monthly',
  [VIEW_MODES.quarterly]: 'Quarterly',
  [VIEW_MODES.yearly]: 'Yearly',
};

export function getDisplayModeLabel(displayMode: ViewMode): string {
  return VIEW_MODE_LABELS[displayMode] ?? 'Per Paycheck';
}

/**
 * Get a user-friendly pay frequency label
 */
const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  [FREQUENCIES.weekly]: 'Weekly',
  [FREQUENCIES.biWeekly]: 'Bi-weekly',
  [FREQUENCIES.semiMonthly]: 'Semi-monthly',
  [FREQUENCIES.monthly]: 'Monthly',
  [FREQUENCIES.quarterly]: 'Quarterly',
  [FREQUENCIES.yearly]: 'Yearly',
};

export function formatPayFrequencyLabel(frequency: PayFrequency | string): string {
  return PAY_FREQUENCY_LABELS[frequency as PayFrequency] ?? 'Bi-weekly';
}

/**
 * Calculate gross pay per paycheck from pay settings
 * @param paySettings - Pay settings from the budget data
 * @returns Gross pay per paycheck
 */
export function calculateGrossPayPerPaycheck(paySettings: PaySettings): number {
  if (paySettings.payType === 'salary') {
    const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
    return (paySettings.annualSalary || 0) / paychecksPerYear;
  }

  return (paySettings.hourlyRate || 0) * (paySettings.hoursPerPayPeriod || 0);
}

export function calculateGrossPayPerYear(paySettings: PaySettings): number {
  if (paySettings.payType === 'salary') {
    return (paySettings.annualSalary || 0);
  }

  return (paySettings.hourlyRate || 0) * (paySettings.hoursPerPayPeriod || 0) * getPaychecksPerYear(paySettings.payFrequency);
}
