export type ApiAuthMode = 'none' | 'shared-secret';
export type ApiStorageBackend = 'memory';

export type ApiConfig = {
    nodeEnv: string;
    currencyApiUrl: string;
    currencyRequestTimeoutMs: number;
    authMode: ApiAuthMode;
    sharedSecret: string | null;
    requireAuth: boolean;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    storageBackend: ApiStorageBackend;
};

function resolveAuthMode(raw: string | undefined): ApiAuthMode {
    return raw === 'shared-secret' ? 'shared-secret' : 'none';
}

function resolveStorageBackend(raw: string | undefined): ApiStorageBackend {
    return raw === 'memory' ? 'memory' : 'memory';
}

export function getApiConfig(): ApiConfig {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const authMode = resolveAuthMode(process.env.API_AUTH_MODE);
    const sharedSecret = process.env.API_SHARED_SECRET?.trim() || null;
    const parsedTimeoutMs = Number(process.env.CURRENCY_REQUEST_TIMEOUT_MS ?? 8000);
    const currencyRequestTimeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
        ? parsedTimeoutMs
        : 8000;
    const parsedRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60000);
    const parsedRateLimitMaxRequests = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS ?? 120);
    const rateLimitWindowMs = Number.isFinite(parsedRateLimitWindowMs) && parsedRateLimitWindowMs > 0
        ? parsedRateLimitWindowMs
        : 60000;
    const rateLimitMaxRequests = Number.isFinite(parsedRateLimitMaxRequests) && parsedRateLimitMaxRequests > 0
        ? parsedRateLimitMaxRequests
        : 120;
    const requireAuth = process.env.API_REQUIRE_AUTH === 'true';

    return {
        nodeEnv,
        currencyApiUrl: process.env.CURRENCY_API_URL ?? 'https://api.frankfurter.app/latest',
        currencyRequestTimeoutMs,
        authMode,
        sharedSecret,
        requireAuth,
        rateLimitWindowMs,
        rateLimitMaxRequests,
        storageBackend: resolveStorageBackend(process.env.API_STORAGE_BACKEND),
    };
}
