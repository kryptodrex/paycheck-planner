// Currency utility functions for formatting money values

/**
 * Common currencies with their symbols and names
 */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', flag: '🇵🇱' },
];

/**
 * Get currency symbol from currency code
 * @param currencyCode - ISO currency code (e.g., "USD")
 * @returns Currency symbol (e.g., "$")
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currencyCode - ISO currency code (e.g., "USD")
 * @param locale - Locale string (e.g., "en-US")
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      ...options,
    }).format(amount);
  } catch {
    // Fallback if locale or currency code is invalid
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString(locale, options)}`;
  }
}

/**
 * Format a number with just the currency symbol (no locale formatting)
 * @param amount - The amount to format
 * @param currencyCode - ISO currency code (e.g., "USD")
 * @param options - toLocaleString options
 * @returns Formatted string with symbol
 */
export function formatWithSymbol(
  amount: number,
  currencyCode: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const symbol = getCurrencySymbol(currencyCode);
  // Handle null, undefined, or NaN values
  const safeAmount = (amount == null || isNaN(amount)) ? 0 : amount;
  const formatted = safeAmount.toLocaleString('en-US', options);
  return `${symbol}${formatted}`;
}

/**
 * Calculate the precise inverse of an exchange rate with formatting
 * @param exchangeRate - The exchange rate to invert (e.g., 0.92 for 1 USD = 0.92 EUR)
 * @param precision - Number of decimal places to display (stripped of trailing zeros)
 * @returns Formatted inverse rate string, or null if rate is invalid
 * @example
 * calculateInverseRate(0.92) => "1.08695652" // 1 EUR ≈ 1.08695652 USD (trailing zeros stripped)
 * calculateInverseRate(149.5) => "0.00668896" // 1 JPY ≈ 0.00668896 USD
 */
export function calculateInverseRate(exchangeRate: number, precision = 8): string | null {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return null;
  }

  const inverse = 1 / exchangeRate;
  // Format to specified precision and remove trailing zeros
  const formatted = inverse.toFixed(precision).replace(/\.?0+$/, '');
  return formatted;
}

