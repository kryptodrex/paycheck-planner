import { STORAGE_KEYS } from '../constants/storage';

export interface CachedExchangeRate {
  base: string;
  quote: string;
  rate: number;
  timestamp: number;
}

export interface ExchangeRateCache {
  [key: string]: CachedExchangeRate;
}

const CURRENCY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY = STORAGE_KEYS.currencyRates;

/**
 * Get the API URL from environment variables.
 * Falls back to Frankfurter API if not configured.
 */
export function getCurrencyApiUrl(): string {
  return __CURRENCY_API_URL__;
}

/**
 * Fetch the latest exchange rate between two currencies.
 * @param base Base currency code (e.g., 'USD')
 * @param quote Quote currency code (e.g., 'EUR')
 * @returns Promise resolving to the exchange rate number, or null if fetch fails
 */
export async function fetchExchangeRate(base: string, quote: string): Promise<number | null> {
  try {
    const apiUrl = getCurrencyApiUrl();
    const url = new URL(apiUrl);
    
    // frankfurter.app API format: /latest?base=USD&quote=EUR
    url.searchParams.set('base', base);
    url.searchParams.set('quote', quote);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Currency API returned status ${response.status}`);
      return null;
    }

    const data = await response.json() as { rates?: Record<string, number> };
    const rate = data.rates?.[quote];

    if (typeof rate === 'number' && rate > 0) {
      return rate;
    }

    console.warn(`Invalid rate data from API: ${JSON.stringify(data)}`);
    return null;
  } catch (error) {
    console.warn('Failed to fetch exchange rate:', error);
    return null;
  }
}

/**
 * Get the last cached rate for a currency pair, if still valid.
 */
export function getCachedRate(base: string, quote: string): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: ExchangeRateCache = JSON.parse(cached);
    const key = `${base}/${quote}`;
    const entry = cache[key];

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CURRENCY_CACHE_TTL_MS) {
      return null; // Cache expired
    }

    return entry.rate;
  } catch (error) {
    console.warn('Failed to read cached exchange rate:', error);
    return null;
  }
}

/**
 * Get the timestamp of the last cached rate (for "Last updated" display).
 */
export function getLastUpdatedTimestamp(base: string, quote: string): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: ExchangeRateCache = JSON.parse(cached);
    const key = `${base}/${quote}`;
    return cache[key]?.timestamp ?? null;
  } catch (error) {
    console.warn('Failed to read cached timestamp:', error);
    return null;
  }
}

/**
 * Cache the exchange rate in localStorage.
 */
export function cacheExchangeRate(base: string, quote: string, rate: number): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    let cache: ExchangeRateCache = cached ? JSON.parse(cached) : {};

    const key = `${base}/${quote}`;
    cache[key] = {
      base,
      quote,
      rate,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache exchange rate:', error);
  }
}

/**
 * Fetch and cache the exchange rate. If fetch fails, try cached value.
 * Returns the rate (fresh or cached) or null if neither available.
 */
export async function getExchangeRate(base: string, quote: string): Promise<{ rate: number; isCached: boolean } | null> {
  // Try to fetch fresh rate
  const freshRate = await fetchExchangeRate(base, quote);

  if (freshRate !== null) {
    cacheExchangeRate(base, quote, freshRate);
    return { rate: freshRate, isCached: false };
  }

  // Fall back to cached rate
  const cachedRate = getCachedRate(base, quote);
  if (cachedRate !== null) {
    return { rate: cachedRate, isCached: true };
  }

  return null;
}

/**
 * Check if a cached rate exists and is still valid.
 */
export function isCachedRateValid(base: string, quote: string): boolean {
  const cached = getCachedRate(base, quote);
  return cached !== null;
}
