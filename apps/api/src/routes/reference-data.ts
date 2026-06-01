import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { appFaqSections } from '../data/appFaqs.js';
import { glossaryCategoryLabels, glossaryTerms } from '../data/glossary.js';
import { US_FEDERAL_TAX_RULES_2026, US_FICA_RULES_2026, US_STATE_HEURISTIC_RULES_2026 } from '../data/usTaxData.js';

type SerializedBand = {
    upTo: number | null;
    rate: number;
};

function serializeBand(band: { upTo: number; rate: number }): SerializedBand {
    return {
        // JSON does not support Infinity; null means "no upper bound".
        upTo: Number.isFinite(band.upTo) ? band.upTo : null,
        rate: band.rate,
    };
}

function computeHash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

const serializedUsTaxData = {
    federal: {
        taxYear: US_FEDERAL_TAX_RULES_2026.taxYear,
        source: US_FEDERAL_TAX_RULES_2026.source,
        sourceLastReviewed: US_FEDERAL_TAX_RULES_2026.sourceLastReviewed,
        standardDeduction: US_FEDERAL_TAX_RULES_2026.standardDeduction,
        brackets: {
            single: US_FEDERAL_TAX_RULES_2026.brackets.single.map(serializeBand),
            married_filing_jointly: US_FEDERAL_TAX_RULES_2026.brackets.married_filing_jointly.map(serializeBand),
        },
    },
    fica: US_FICA_RULES_2026,
    stateHeuristic: {
        taxYear: US_STATE_HEURISTIC_RULES_2026.taxYear,
        source: US_STATE_HEURISTIC_RULES_2026.source,
        bands: US_STATE_HEURISTIC_RULES_2026.bands.map(serializeBand),
    },
};

const glossaryData = {
    terms: glossaryTerms,
    categoryLabels: glossaryCategoryLabels,
};

const appFaqsData = {
    sections: appFaqSections,
};

const usTaxMeta = {
    version: `tax-${US_FEDERAL_TAX_RULES_2026.taxYear}.${US_FICA_RULES_2026.taxYear}`,
    hash: computeHash(serializedUsTaxData),
};

const glossaryMeta = {
    version: '1',
    hash: computeHash(glossaryData),
};

const appFaqsMeta = {
    version: '1',
    hash: computeHash(appFaqsData),
};

export function referenceDataRouter(): Hono {
    const router = new Hono();

    router.get('/reference-data/index', (c) => c.json({
        resources: {
            usTaxData: usTaxMeta,
            glossary: glossaryMeta,
            appFaqs: appFaqsMeta,
        },
    }));

    router.get('/reference-data/us-tax', (c) => c.json({
        version: usTaxMeta.version,
        hash: usTaxMeta.hash,
        data: serializedUsTaxData,
    }));

    router.get('/reference-data/glossary', (c) => c.json({
        version: glossaryMeta.version,
        hash: glossaryMeta.hash,
        data: glossaryData,
    }));

    router.get('/reference-data/app-faqs', (c) => c.json({
        version: appFaqsMeta.version,
        hash: appFaqsMeta.hash,
        data: appFaqsData,
    }));

    return router;
}
