import { describe, expect, it, vi } from 'vitest';
import { apiVersion, createApp } from './app.js';

describe('API app', () => {
  it('serves a health check', async () => {
    const app = createApp();
    const response = await app.request('/health');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      service: 'api',
      name: 'paycheck-planner-api',
      version: apiVersion,
    });
  });

  it('proxies currency conversion through the API service', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2026-05-31', rates: { EUR: 0.92 } }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true,
    });

    const app = createApp();
    const response = await app.request('/currency-conversion?from=usd&to=eur');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ base: 'USD', date: '2026-05-31', rates: { EUR: 0.92 } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('/latest?from=USD&to=EUR&amount=1');
  });

  it('returns standardized error envelope for missing currency query params', async () => {
    const app = createApp();
    const response = await app.request('/currency-conversion?from=usd');
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      status: 400,
      message: 'from and to query parameters are required',
    });
  });

  it('returns standardized error envelope for not found routes', async () => {
    const app = createApp();
    const response = await app.request('/does-not-exist');
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      status: 404,
      message: 'Not Found',
    });
  });
});
