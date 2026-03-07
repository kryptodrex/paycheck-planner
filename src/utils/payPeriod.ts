/**
 * Utility functions for pay period conversions and display modes
 * These functions help convert between different time periods (paycheck, monthly, yearly)
 */

import type { PayFrequency, PaySettings } from '../types/auth';
import { roundUpToCent } from './money';

/**
 * Get the number of paychecks per year based on pay frequency
 * @param frequency - The pay frequency ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')
 * @returns Number of paychecks per year
 */
export function getPaychecksPerYear(frequency: PayFrequency | string): number {
  switch (frequency) {
    case 'weekly':
      return 52;
    case 'bi-weekly':
      return 26;
    case 'semi-monthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 26; // Default to bi-weekly if unknown
  }
}

/**
 * Convert a per-paycheck amount to the specified display mode
 * @param paycheckAmount - Amount per paycheck
 * @param paychecksPerYear - Number of paychecks per year (from getPaychecksPerYear)
 * @param displayMode - The display mode ('paycheck', 'monthly', 'yearly')
 * @returns Converted amount in the requested display mode
 */
export function convertToDisplayMode(
  paycheckAmount: number,
  paychecksPerYear: number,
  displayMode: 'paycheck' | 'monthly' | 'yearly'
): number {
  switch (displayMode) {
    case 'paycheck':
      return paycheckAmount;
    case 'monthly':
      return roundUpToCent((paycheckAmount * paychecksPerYear) / 12);
    case 'yearly':
      return roundUpToCent(paycheckAmount * paychecksPerYear);
    default:
      return paycheckAmount;
  }
}

/**
 * Get the human-readable label for a display mode
 * @param displayMode - The display mode ('paycheck', 'monthly', 'yearly')
 * @returns Human-readable label
 */
export function getDisplayModeLabel(displayMode: 'paycheck' | 'monthly' | 'yearly'): string {
  switch (displayMode) {
    case 'paycheck':
      return 'Per Paycheck';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Per Paycheck';
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
