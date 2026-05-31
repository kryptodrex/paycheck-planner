import { describe, expect, it, vi, beforeEach } from 'vitest';
import { proxyCurrencyConversion } from './currency-proxy.js';

describe('currency-proxy', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(globalThis, 'fetch', {
            value: vi.fn(),
            configurable: true,
        });
    });

    it('proxies upstream exchange rate data', async () => {
        const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ base: 'USD', date: '2026-05-31', rates: { EUR: 0.92 } }),
        });

        const result = await proxyCurrencyConversion('1', 'usd', 'eur');

        expect(result).toEqual({
            base: 'USD', 
            date: '2026-05-31', 
            rates: { EUR: 0.92 },
        });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy.mock.calls[0]?.[0]).toContain('/latest?from=USD&to=EUR&amount=1');
    });

    it('returns a structured error when query parameters are missing', async () => {
        const result = await proxyCurrencyConversion('10', '', 'eur');

        expect(result).toEqual({
            status: 400,
            message: 'from and to query parameters are required',
        });
    });
});
