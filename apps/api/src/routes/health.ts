import { Hono } from 'hono';

type HealthRouterOptions = {
    name: string;
    version: string;
};

export function healthRouter(options: HealthRouterOptions): Hono {
    const router = new Hono();

    router.get('/health', (c) => c.json({
        ok: true,
        service: 'api',
        name: options.name,
        version: options.version,
    }));

    return router;
}
