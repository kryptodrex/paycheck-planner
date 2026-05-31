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
 * Simulates the running account balance across all 12 months, starting at
 * zero, and returns the absolute value of the deepest trough (clamped to 0).
 * This is the amount that must pre-exist in the account to prevent it from
 * ever going negative.
 *
 * `paychecksPerMonth` must be a 12-element array of paycheck counts
 * (index 0 = January ... index 11 = December) for the relevant year.
 *
 * Returns 0 when `monthlyTotal` is zero or the schedule is always self-funding.
 */
export function calculateRecommendedBuffer(
  monthlyTotal: number,
  paychecksPerYear: number,
  paychecksPerMonth: number[],
): number {
  if (monthlyTotal <= 0 || paychecksPerYear <= 0) return 0;
  const stableAllocation = calculateStableAllocation(monthlyTotal, paychecksPerYear);
  let balance = 0;
  let worstBalance = 0;
  for (const pcks of paychecksPerMonth) {
    const deposited = roundToCent(stableAllocation * pcks);
    balance = roundToCent(balance + deposited - monthlyTotal);
    if (balance < worstBalance) worstBalance = balance;
  }
  return roundToCent(Math.max(0, -worstBalance));
}
