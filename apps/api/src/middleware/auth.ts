import { timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { ApiAuthMode } from '../config.js';

type AuthConfig = {
    authMode: ApiAuthMode;
    sharedSecret: string | null;
    requireAuth: boolean;
};

function isAuthorized(candidate: string, expected: string): boolean {
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);

    return (
        candidateBuffer.length === expectedBuffer.length
        && timingSafeEqual(candidateBuffer, expectedBuffer)
    );
}

export function createAuthMiddleware(config: AuthConfig): MiddlewareHandler {
    const sharedSecret = config.sharedSecret;

    if (config.authMode !== 'shared-secret' || !sharedSecret) {
        if (config.requireAuth) {
            return async (c, _next) => c.json({
                status: 503,
                message: 'API auth misconfigured: shared-secret auth is required',
            }, 503);
        }

        return async (_c, next) => next();
    }

    return async (c, next) => {
        const authHeader = c.req.header('Authorization');
        const apiKeyHeader = c.req.header('x-api-key');

        let provided: string | null = null;
        if (authHeader?.startsWith('Bearer ')) {
            provided = authHeader.slice('Bearer '.length);
        } else if (apiKeyHeader) {
            provided = apiKeyHeader;
        }

        if (!provided || !isAuthorized(provided, sharedSecret)) {
            c.header('WWW-Authenticate', 'Bearer realm="paycheck-planner-api"');
            return c.json({ status: 401, message: 'Unauthorized' }, 401);
        }

        return next();
    };
}
