import { describe, expect, it, vi } from 'vitest';
import { apiVersion, createApp } from './app.js';

describe('API app', () => {
  it('returns storage health placeholder', async () => {
    const app = createApp();
    const response = await app.request('/storage/health');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      backend: 'memory',
      ready: true,
    });
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

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

  it('serves reference data index with per-resource version/hash metadata', async () => {
    const app = createApp();
    const response = await app.request('/reference-data/index');
    const payload = await response.json() as {
      resources?: {
        usTaxData?: { version: string; hash: string };
        glossary?: { version: string; hash: string };
        appFaqs?: { version: string; hash: string };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.resources?.usTaxData?.version).toBeTruthy();
    expect(payload.resources?.usTaxData?.hash).toBeTruthy();
    expect(payload.resources?.glossary?.version).toBeTruthy();
    expect(payload.resources?.glossary?.hash).toBeTruthy();
    expect(payload.resources?.appFaqs?.version).toBeTruthy();
    expect(payload.resources?.appFaqs?.hash).toBeTruthy();
  });

  it('serves us tax reference data as a dedicated endpoint', async () => {
    const app = createApp();
    const response = await app.request('/reference-data/us-tax');
    const payload = await response.json() as {
      version?: string;
      hash?: string;
      data?: {
        federal?: {
          brackets?: {
            single?: Array<{ upTo: number | null; rate: number }>;
          };
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.version).toBeTruthy();
    expect(payload.hash).toBeTruthy();
    expect(payload.data?.federal?.brackets?.single?.at(-1)?.upTo).toBeNull();
  });

  it('serves glossary and faq reference data as dedicated endpoints', async () => {
    const app = createApp();
    const glossaryResponse = await app.request('/reference-data/glossary');
    const faqResponse = await app.request('/reference-data/app-faqs');
    const glossaryPayload = await glossaryResponse.json() as {
      version?: string;
      hash?: string;
      data?: {
        terms?: Array<{ id: string }>;
      };
    };
    const faqPayload = await faqResponse.json() as {
      version?: string;
      hash?: string;
      data?: {
        sections?: Array<{ id: string }>;
      };
    };

    expect(glossaryResponse.status).toBe(200);
    expect(faqResponse.status).toBe(200);
    expect(glossaryPayload.version).toBeTruthy();
    expect(glossaryPayload.hash).toBeTruthy();
    expect(faqPayload.version).toBeTruthy();
    expect(faqPayload.hash).toBeTruthy();
    expect(glossaryPayload.data?.terms?.length).toBeGreaterThan(0);
    expect(faqPayload.data?.sections?.length).toBeGreaterThan(0);
  });

  it('returns 401 when shared-secret auth is enabled and credentials are missing', async () => {
    process.env.API_AUTH_MODE = 'shared-secret';
    process.env.API_SHARED_SECRET = 'test-secret';

    try {
      const app = createApp();
      const response = await app.request('/health');
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload).toEqual({
        status: 401,
        message: 'Unauthorized',
      });
    } finally {
      delete process.env.API_AUTH_MODE;
      delete process.env.API_SHARED_SECRET;
    }
  });

  it('allows requests with valid shared-secret auth', async () => {
    process.env.API_AUTH_MODE = 'shared-secret';
    process.env.API_SHARED_SECRET = 'test-secret';

    try {
      const app = createApp();
      const response = await app.request('/health', {
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      expect(response.status).toBe(200);
    } finally {
      delete process.env.API_AUTH_MODE;
      delete process.env.API_SHARED_SECRET;
    }
  });

  it('returns timeout envelope when currency upstream exceeds timeout', async () => {
    process.env.CURRENCY_REQUEST_TIMEOUT_MS = '1';

    const fetchSpy = vi.fn().mockImplementation((_url: string, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new Error('AbortError'));
      });
    }));
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true,
    });

    try {
      const app = createApp();
      const response = await app.request('/currency-conversion?from=usd&to=eur');
      const payload = await response.json();

      expect(response.status).toBe(504);
      expect(payload).toEqual({
        status: 504,
        message: 'Currency service unavailable: request timed out after 1ms.',
      });
    } finally {
      delete process.env.CURRENCY_REQUEST_TIMEOUT_MS;
    }
  });

  it('fails closed when auth is required but shared-secret is not configured', async () => {
    process.env.API_REQUIRE_AUTH = 'true';
    delete process.env.API_SHARED_SECRET;
    delete process.env.API_AUTH_MODE;

    try {
      const app = createApp();
      const response = await app.request('/health');
      const payload = await response.json();

      expect(response.status).toBe(503);
      expect(payload).toEqual({
        status: 503,
        message: 'API auth misconfigured: shared-secret auth is required',
      });
    } finally {
      delete process.env.API_REQUIRE_AUTH;
    }
  });

  it('rate limits burst requests on currency route from the same client', async () => {
    process.env.API_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.API_RATE_LIMIT_MAX_REQUESTS = '1';

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2026-05-31', rates: { EUR: 0.92 } }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true,
    });

    try {
      const app = createApp();
      const first = await app.request('/currency-conversion?from=usd&to=eur', { headers: { 'x-real-ip': '10.0.0.1' } });
      const second = await app.request('/currency-conversion?from=usd&to=eur', { headers: { 'x-real-ip': '10.0.0.1' } });
      const payload = await second.json();

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(payload).toEqual({ status: 429, message: 'Too Many Requests' });
      expect(second.headers.get('retry-after')).toBeTruthy();
    } finally {
      delete process.env.API_RATE_LIMIT_WINDOW_MS;
      delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
    }
  });

  it('rate limits health route as part of global service throttling', async () => {
    process.env.API_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.API_RATE_LIMIT_MAX_REQUESTS = '1';

    try {
      const app = createApp();
      const first = await app.request('/health', { headers: { 'x-real-ip': '10.0.0.2' } });
      const second = await app.request('/health', { headers: { 'x-real-ip': '10.0.0.2' } });
      const payload = await second.json();

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(payload).toEqual({ status: 429, message: 'Too Many Requests' });
      expect(second.headers.get('retry-after')).toBeTruthy();
    } finally {
      delete process.env.API_RATE_LIMIT_WINDOW_MS;
      delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
    }
  });
});
