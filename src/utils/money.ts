/**
 * Utility functions for money calculations
 */

/**
 * Round up to the nearest cent (0.01)
 * Examples:
 * - 10.005 -> 10.01
 * - 10.001 -> 10.01
 * - 10.00 -> 10.00
 */
export function roundUpToCent(amount: number): number {
  return Math.ceil(amount * 100) / 100;
}

/**
 * Round up multiple numbers to the nearest cent
 */
export function roundUpAllToCent(...amounts: number[]): number[] {
  return amounts.map(roundUpToCent);
}

/**
 * Sum multiple amounts and round up to the nearest cent
 */
export function sumAndRound(...amounts: number[]): number {
  return roundUpToCent(amounts.reduce((sum, amount) => sum + amount, 0));
}
