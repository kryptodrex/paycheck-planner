type FrankfurterResponse = {
    amount?: number;
    base?: string;
    date?: string;
    rates?: Record<string, number>;
};

type CurrencyProxySuccess = FrankfurterResponse;

type CurrencyProxyError = {
    status: number;
    message: string;
};

export type CurrencyProxyResult = CurrencyProxySuccess | CurrencyProxyError;

export async function proxyCurrencyConversion(amount: string, from: string, to: string): Promise<CurrencyProxyResult> {
    const fromCurrency = from.trim().toUpperCase();
    const toCurrency = to.trim().toUpperCase();

    if (!fromCurrency || !toCurrency) {
        return {
            status: 400,
            message: 'from and to query parameters are required',
        };
    }

    const upstreamUrl = new URL(process.env.CURRENCY_API_URL ?? 'https://api.frankfurter.app/latest');
    upstreamUrl.searchParams.set('from', fromCurrency);
    upstreamUrl.searchParams.set('to', toCurrency);
    if (amount) {
        upstreamUrl.searchParams.set('amount', amount.toString());
    }

    try {
        const upstreamResponse = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        if (!upstreamResponse.ok) {
            return {
                status: 502,
                message: `Currency service unavailable: upstream returned HTTP ${upstreamResponse.status}.`,
            };
        }

        const data = await upstreamResponse.json() as FrankfurterResponse;
        return data;
    } catch (error) {
        return {
            status: 502,
            message: `Currency service unavailable: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
