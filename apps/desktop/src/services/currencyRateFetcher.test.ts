/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchExchangeRate,
  getCachedRate,
  cacheExchangeRate,
  getExchangeRate,
  getLastUpdatedTimestamp,
  isCachedRateValid,
  getCurrencyApiUrl,
} from './currencyRateFetcher';

describe('currencyRateFetcher', () => {
  const CACHE_KEY = 'paycheck-planner-currency-rates';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Mock fetch globally
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('fetchExchangeRate', () => {
    it('should fetch exchange rate from API', async () => {
      const mockResponse = {
        rates: {
          EUR: 0.92,
        },
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const rate = await fetchExchangeRate('USD', 'EUR');
      expect(rate).toBe(0.92);
      expect(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });

    it('should return null on network error', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const rate = await fetchExchangeRate('USD', 'EUR');
      expect(rate).toBeNull();
    });

    it('should return null on non-ok response status', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const rate = await fetchExchangeRate('USD', 'EUR');
      expect(rate).toBeNull();
    });

    it('should return null on invalid response data', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const rate = await fetchExchangeRate('USD', 'EUR');
      expect(rate).toBeNull();
    });

    it('should construct correct API URL with base and quote', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { EUR: 0.92 } }),
      });

      await fetchExchangeRate('USD', 'EUR');
      const callUrl = ((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] || [])[0];
      expect(callUrl).toContain('base=USD');
      expect(callUrl).toContain('quote=EUR');
    });
  });

  describe('cacheExchangeRate and getCachedRate', () => {
    it('should cache and retrieve exchange rate', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);
      const rate = getCachedRate('USD', 'EUR');
      expect(rate).toBe(0.92);
    });

    it('should return null for uncached pair', () => {
      const rate = getCachedRate('USD', 'EUR');
      expect(rate).toBeNull();
    });

    it('should return null for expired cached rate', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);

      // Manually set an old timestamp
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache['USD/EUR'].timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      const rate = getCachedRate('USD', 'EUR');
      expect(rate).toBeNull();
    });

    it('should handle corrupted cache gracefully', () => {
      localStorage.setItem(CACHE_KEY, 'invalid json');
      const rate = getCachedRate('USD', 'EUR');
      expect(rate).toBeNull();
    });
  });

  describe('getLastUpdatedTimestamp', () => {
    it('should return timestamp of cached rate', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);
      const timestamp = getLastUpdatedTimestamp('USD', 'EUR');
      expect(timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it('should return null for uncached pair', () => {
      const timestamp = getLastUpdatedTimestamp('USD', 'EUR');
      expect(timestamp).toBeNull();
    });
  });

  describe('getExchangeRate', () => {
    it('should return fresh rate when available', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { EUR: 0.92 } }),
      });

      const result = await getExchangeRate('USD', 'EUR');
      expect(result?.rate).toBe(0.92);
      expect(result?.isCached).toBe(false);
    });

    it('should fall back to cached rate on fetch failure', async () => {
      // Pre-cache a rate
      cacheExchangeRate('USD', 'EUR', 0.92);

      // Mock fetch to fail
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const result = await getExchangeRate('USD', 'EUR');
      expect(result?.rate).toBe(0.92);
      expect(result?.isCached).toBe(true);
    });

    it('should return null when neither fresh nor cached rate available', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const result = await getExchangeRate('USD', 'EUR');
      expect(result).toBeNull();
    });

    it('should update cache on successful fetch', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { EUR: 0.92 } }),
      });

      await getExchangeRate('USD', 'EUR');
      const cached = getCachedRate('USD', 'EUR');
      expect(cached).toBe(0.92);
    });
  });

  describe('isCachedRateValid', () => {
    it('should return true for valid cached rate', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);
      expect(isCachedRateValid('USD', 'EUR')).toBe(true);
    });

    it('should return false for uncached pair', () => {
      expect(isCachedRateValid('USD', 'EUR')).toBe(false);
    });

    it('should return false for expired cached rate', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);

      // Manually set an old timestamp
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache['USD/EUR'].timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      expect(isCachedRateValid('USD', 'EUR')).toBe(false);
    });
  });

  describe('getCurrencyApiUrl', () => {
    it('should return configured API URL or fallback', () => {
      const url = getCurrencyApiUrl();
      expect(url).toBeTruthy();
      expect(url).toContain('frankfurter');
    });
  });

  describe('multiple currency pairs', () => {
    it('should cache multiple currency pairs independently', () => {
      cacheExchangeRate('USD', 'EUR', 0.92);
      cacheExchangeRate('USD', 'GBP', 0.79);

      expect(getCachedRate('USD', 'EUR')).toBe(0.92);
      expect(getCachedRate('USD', 'GBP')).toBe(0.79);
    });
  });
});
