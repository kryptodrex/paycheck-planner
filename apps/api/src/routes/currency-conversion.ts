import { Hono } from 'hono';
import { proxyCurrencyConversion } from '../services/currency-proxy.js';

type CurrencyConversionRouterOptions = {
    currencyApiUrl: string;
    currencyRequestTimeoutMs: number;
};

export function currencyConversionRouter(options: CurrencyConversionRouterOptions): Hono {
    const router = new Hono();

    router.get('/currency-conversion', async (c) => {
        const from = c.req.query('from') ?? '';
        const to = c.req.query('to') ?? '';
        const amount = c.req.query('amount') ?? '1';
        const result = await proxyCurrencyConversion(
            options.currencyApiUrl,
            amount,
            from,
            to,
            options.currencyRequestTimeoutMs,
        );

        if ('status' in result && 'message' in result) {
            if (result.status === 400) {
                return c.json({
                    status: result.status,
                    message: result.message,
                }, 400);
            }

            if (result.status === 504) {
                return c.json({
                    status: result.status,
                    message: result.message,
                }, 504);
            }

            return c.json({
                status: result.status,
                message: result.message,
            }, 502);
        }

        return c.json(result);
    });

    return router;
}
