/**
 * Utility functions for pay period conversions and display modes
 * These functions help convert between different time periods (paycheck, monthly, yearly)
 */

import type { PayFrequency } from '../types/frequencies';
import type { PaySettings } from '../types/payroll';
import type { ViewMode } from '../types/viewMode';
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
  switch (String(frequency)) {
    case 'weekly':
      return 'weekly';
    case 'bi-weekly':
      return 'bi-weekly';
    case 'semi-monthly':
      return 'semi-monthly';
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    case 'yearly':
      return 'yearly';
    default:
      return 'bi-weekly';
  }
}

/**
 * Convert a per-paycheck amount to the specified display mode
 * @param paycheckAmount - Amount per paycheck
 * @param paychecksPerYear - Number of paychecks per year (from getPaychecksPerYear)
 * @param displayMode - The display mode
 * @returns Converted amount in the requested display mode
 */
export function getDisplayModeOccurrencesPerYear(
  displayMode: ViewMode,
  paychecksPerYear: number,
): number {
  switch (displayMode) {
    case 'paycheck':
      return paychecksPerYear;
    case 'weekly':
      return 52;
    case 'bi-weekly':
      return 26;
    case 'semi-monthly':
      return 24;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'yearly':
      return 1;
    default:
      return paychecksPerYear;
  }
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
export function getDisplayModeLabel(displayMode: ViewMode): string {
  switch (displayMode) {
    case 'paycheck':
      return 'Per Paycheck';
    case 'weekly':
      return 'Weekly';
    case 'bi-weekly':
      return 'Bi-weekly';
    case 'semi-monthly':
      return 'Semi-monthly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Per Paycheck';
  }
}

/**
 * Get a user-friendly pay frequency label
 */
export function formatPayFrequencyLabel(frequency: PayFrequency | string): string {
  switch (String(frequency)) {
    case 'weekly':
      return 'Weekly';
    case 'bi-weekly':
      return 'Bi-weekly';
    case 'semi-monthly':
      return 'Semi-monthly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Bi-weekly';
  }
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
