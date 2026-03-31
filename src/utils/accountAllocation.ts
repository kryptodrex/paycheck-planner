import { roundToCent } from './money';

/**
 * Returns the fixed per-paycheck amount to transfer into an account so that
 * the account's monthly bill obligations are covered smoothly over a year.
 *
 * Formula: `monthlyTotal × 12 / paychecksPerYear`
 *
 * This amount is the same on every paycheck regardless of whether the month
 * has 2 or 3 paychecks. Over any 12-month period the total transferred equals
 * the total billed.
 *
 * Returns 0 when `paychecksPerYear` is zero or `monthlyTotal` is zero.
 */
export function calculateStableAllocation(monthlyTotal: number, paychecksPerYear: number): number {
  if (paychecksPerYear <= 0 || monthlyTotal <= 0) return 0;
  return roundToCent((monthlyTotal * 12) / paychecksPerYear);
}

/**
 * Returns the minimum seed balance an account needs before the stable
 * per-paycheck allocation becomes self-sustaining.
 *
 * This is the worst-case shortfall: how much the account would go into the
 * red during a short month *before* a long month replenishes it.
 *
 * Formula: `monthlyTotal - (stableAllocation × minPaychecksInAnyMonth)`
 *
 * Uses `minPaychecksInMonth` (the fewest paychecks in any calendar month for
 * the year) when it is provided. Falls back to `calculateConservativeBuffer`
 * (one full month's total) when it is absent.
 *
 * A negative result is clamped to 0 (accounts that are always overfunded
 * need no buffer).
 */
export function calculateRecommendedBuffer(
  monthlyTotal: number,
  paychecksPerYear: number,
  minPaychecksInMonth: number,
): number {
  if (monthlyTotal <= 0) return 0;
  const stableAllocation = calculateStableAllocation(monthlyTotal, paychecksPerYear);
  const deposited = roundToCent(stableAllocation * minPaychecksInMonth);
  return roundToCent(Math.max(0, monthlyTotal - deposited));
}

/**
 * Conservative fallback buffer when calendar data is unavailable.
 * Simply equal to one month's bill total — always safe to seed.
 */
export function calculateConservativeBuffer(monthlyTotal: number): number {
  if (monthlyTotal <= 0) return 0;
  return roundToCent(monthlyTotal);
}
