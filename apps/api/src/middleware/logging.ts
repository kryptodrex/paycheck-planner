import type { MiddlewareHandler } from 'hono';
import { getRequestIdFromContext } from './request-id.js';

export function createLoggingMiddleware(): MiddlewareHandler {
    return async (c, next) => {
        const startedAt = Date.now();
        await next();

        const durationMs = Date.now() - startedAt;
        const requestId = getRequestIdFromContext(c);

        console.info(JSON.stringify({
            requestId,
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            durationMs,
            timestamp: new Date().toISOString(),
        }));
    };
}
