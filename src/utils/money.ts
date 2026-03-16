/**
 * Utility functions for money calculations
 */

/**
 * Round up to the nearest cent (0.01).
 *
 * Use this when you intentionally want to avoid underestimating an amount
 * (for example conservative allocation/tax math).
 * Examples:
 * - 10.005 -> 10.01
 * - 10.001 -> 10.01
 * - 10.00 -> 10.00
 */
export function roundUpToCent(amount: number): number {
  return Math.ceil(amount * 100) / 100;
}

/**
 * Round to the nearest cent (0.01) using standard rounding.
 *
 * Use this for user-facing values where "closest cent" is expected.
 * Examples:
 * - 10.004 -> 10.00
 * - 10.005 -> 10.01
 * - 10.00 -> 10.00
 */
export function roundToCent(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
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
/**
 * Format a number with thousands separators and decimal places
 * Examples:
 * - 1000.5 -> "1,000.50"
 * - 1005.505 -> "1,005.50" (rounded to 2 decimals)
 * - 100 -> "100.00"
 */
export function formatNumberDisplay(amount: number, decimals: number = 2, locale?: string): string {
  return amount.toLocaleString(locale || 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a formatted number string back to a number
 * Removes commas and converts to float
 * Examples:
 * - "1,000.50" -> 1000.50
 * - "1,005" -> 1005
 */
export function parseFormattedNumber(value: string, locale?: string): number {
  const normalizedValue = value.trim();
  if (!normalizedValue) return 0;

  if (locale) {
    try {
      const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
      const groupSeparator = parts.find((part) => part.type === 'group')?.value || ',';
      const decimalSeparator = parts.find((part) => part.type === 'decimal')?.value || '.';

      const escapedGroup = groupSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalized = normalizedValue
        .replace(new RegExp(escapedGroup, 'g'), '')
        .replace(decimalSeparator, '.');

      return parseFloat(normalized) || 0;
    } catch {
      // Fall back to default parsing behavior.
    }
  }

  return parseFloat(normalizedValue.replace(/,/g, '')) || 0;
}