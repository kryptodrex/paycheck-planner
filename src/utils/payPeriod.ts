/**
 * Utility functions for pay period conversions and display modes
 * These functions help convert between different time periods (paycheck, monthly, yearly)
 */

import type { PayFrequency, PaySettings } from '../types/auth';
import { getPayFrequencyOccurrencesPerYear } from './frequency';

/**
 * Get the number of paychecks per year based on pay frequency
 * @param frequency - The pay frequency ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')
 * @returns Number of paychecks per year
 */
export function getPaychecksPerYear(frequency: PayFrequency | string): number {
  return getPayFrequencyOccurrencesPerYear(String(frequency));
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
  const roundToCent = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

  switch (displayMode) {
    case 'paycheck':
      return roundToCent(paycheckAmount);
    case 'monthly':
      return roundToCent((paycheckAmount * paychecksPerYear) / 12);
    case 'yearly':
      return roundToCent(paycheckAmount * paychecksPerYear);
    default:
      return roundToCent(paycheckAmount);
  }
}

/**
 * Convert a display mode amount back to per-paycheck amount
 * @param displayAmount - Amount in the display mode
 * @param paychecksPerYear - Number of paychecks per year (from getPaychecksPerYear)
 * @param displayMode - The display mode ('paycheck', 'monthly', 'yearly')
 * @returns Amount per paycheck
 */
export function convertFromDisplayMode(
  displayAmount: number,
  paychecksPerYear: number,
  displayMode: 'paycheck' | 'monthly' | 'yearly'
): number {
  switch (displayMode) {
    case 'paycheck':
      return displayAmount;
    case 'monthly':
      return (displayAmount * 12) / paychecksPerYear;
    case 'yearly':
      return displayAmount / paychecksPerYear;
    default:
      return displayAmount;
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
