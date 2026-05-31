import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

console.log(`Paycheck Planner API listening on port ${port}`);

serve({ fetch: app.fetch, port });
