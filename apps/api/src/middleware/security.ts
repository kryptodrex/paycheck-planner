import type { MiddlewareHandler } from 'hono';

type SecurityConfig = {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
};

type RateLimitEntry = {
    count: number;
    windowStartedAt: number;
};

function getClientKey(c: { req: { header: (name: string) => string | undefined } }): string {
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = c.req.header('x-real-ip')?.trim();
    return forwardedFor || realIp || 'unknown';
}

export function createSecurityHeadersMiddleware(): MiddlewareHandler {
    return async (c, next) => {
        await next();

        c.header('X-Content-Type-Options', 'nosniff');
        c.header('X-Frame-Options', 'DENY');
        c.header('Referrer-Policy', 'no-referrer');
        c.header('Cache-Control', 'no-store');
    };
}

export function createRateLimitMiddleware(config: SecurityConfig): MiddlewareHandler {
    const requestsByClient = new Map<string, RateLimitEntry>();

    return async (c, next) => {
        const now = Date.now();
        // Lightweight cleanup to prevent unbounded map growth.
        const staleKeys: string[] = [];
        requestsByClient.forEach((entry, key) => {
            if (now - entry.windowStartedAt >= config.rateLimitWindowMs) {
                staleKeys.push(key);
            }
        });
        staleKeys.forEach((key) => requestsByClient.delete(key));

        const clientKey = getClientKey(c);
        const existing = requestsByClient.get(clientKey);

        if (!existing || now - existing.windowStartedAt >= config.rateLimitWindowMs) {
            requestsByClient.set(clientKey, { count: 1, windowStartedAt: now });
            return next();
        }

        if (existing.count >= config.rateLimitMaxRequests) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((config.rateLimitWindowMs - (now - existing.windowStartedAt)) / 1000),
            );
            c.header('Retry-After', String(retryAfterSeconds));
            return c.json({ status: 429, message: 'Too Many Requests' }, 429);
        }

        existing.count += 1;
        return next();
    };
}
