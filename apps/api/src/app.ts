import fs from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getApiConfig } from './config.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createLoggingMiddleware } from './middleware/logging.js';
import { createRequestIdMiddleware } from './middleware/request-id.js';
import { createRateLimitMiddleware, createSecurityHeadersMiddleware } from './middleware/security.js';
import { healthRouter } from './routes/health.js';
import { currencyConversionRouter } from './routes/currency-conversion.js';
import { referenceDataRouter } from './routes/reference-data.js';
import { createStorageBoundary } from './services/storage.js';

const packageJson = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as { version?: string };
export const apiVersion = packageJson.version ?? '0.0.0';

export function createApp(): Hono {
    const app = new Hono();
    const config = getApiConfig();
    const storage = createStorageBoundary(config.storageBackend);

    app.use('*', createRequestIdMiddleware());
    app.use('*', cors());
    app.use('*', createLoggingMiddleware());
    app.use('*', createSecurityHeadersMiddleware());
    app.use('*', createRateLimitMiddleware({
        rateLimitWindowMs: config.rateLimitWindowMs,
        rateLimitMaxRequests: config.rateLimitMaxRequests,
    }));
    app.use('*', createAuthMiddleware(config));

    app.route('/', healthRouter({ name: 'paycheck-planner-api', version: apiVersion }));
    app.route('/', currencyConversionRouter({
        currencyApiUrl: config.currencyApiUrl,
        currencyRequestTimeoutMs: config.currencyRequestTimeoutMs,
    }));
    app.route('/', referenceDataRouter());
    app.get('/storage/health', (c) => c.json(storage.getHealth()));
    app.notFound((c) => c.json({ status: 404, message: 'Not Found' }, 404));

    return app;
}
