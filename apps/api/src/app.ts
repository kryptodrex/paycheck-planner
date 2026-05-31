import fs from 'node:fs';
import { Hono } from 'hono';
import { healthRouter } from './routes/health.js';
import { currencyConversionRouter } from './routes/currency-conversion.js';

const packageJson = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as { version?: string };
export const apiVersion = packageJson.version ?? '0.0.0';

export function createApp(): Hono {
    const app = new Hono();

    app.route('/', healthRouter({ name: 'paycheck-planner-api', version: apiVersion }));
    app.route('/', currencyConversionRouter());
    app.notFound((c) => c.json({ status: 404, message: 'Not Found' }, 404));

    return app;
}
