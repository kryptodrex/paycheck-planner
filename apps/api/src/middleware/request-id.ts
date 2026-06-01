import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

const REQUEST_ID_HEADER = 'x-request-id';

function normalizeRequestId(raw: string | undefined): string {
    const value = raw?.trim();
    if (!value) return randomUUID();
    return value.slice(0, 128);
}

export function createRequestIdMiddleware(): MiddlewareHandler {
    return async (c, next) => {
        const requestId = normalizeRequestId(c.req.header(REQUEST_ID_HEADER));
        c.set('requestId', requestId);

        await next();

        c.header(REQUEST_ID_HEADER, requestId);
    };
}

export function getRequestIdFromContext(c: { get: (key: string) => unknown }): string | null {
    const requestId = c.get('requestId');
    return typeof requestId === 'string' ? requestId : null;
}
