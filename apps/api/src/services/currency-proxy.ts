type FrankfurterResponse = {
    amount?: number;
    base?: string;
    date?: string;
    rates?: Record<string, number>;
};

type CurrencyProxySuccess = FrankfurterResponse;

type CurrencyProxyError = {
    status: 400 | 502 | 504;
    message: string;
};

export type CurrencyProxyResult = CurrencyProxySuccess | CurrencyProxyError;

export async function proxyCurrencyConversion(
    currencyApiUrl: string,
    amount: string,
    from: string,
    to: string,
    requestTimeoutMs: number = 8000,
): Promise<CurrencyProxyResult> {
    const fromCurrency = from.trim().toUpperCase();
    const toCurrency = to.trim().toUpperCase();

    if (!fromCurrency || !toCurrency) {
        return {
            status: 400,
            message: 'from and to query parameters are required',
        };
    }

    const upstreamUrl = new URL(currencyApiUrl);
    upstreamUrl.searchParams.set('from', fromCurrency);
    upstreamUrl.searchParams.set('to', toCurrency);
    if (amount) {
        upstreamUrl.searchParams.set('amount', amount.toString());
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

        try {
            const upstreamResponse = await fetch(upstreamUrl.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!upstreamResponse.ok) {
                return {
                    status: 502,
                    message: `Currency service unavailable: upstream returned HTTP ${upstreamResponse.status}.`,
                };
            }

            const data = await upstreamResponse.json() as FrankfurterResponse;
            return data;
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        if (error instanceof Error && /abort/i.test(error.message)) {
            return {
                status: 504,
                message: `Currency service unavailable: request timed out after ${requestTimeoutMs}ms.`,
            };
        }

        return {
            status: 502,
            message: `Currency service unavailable: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
