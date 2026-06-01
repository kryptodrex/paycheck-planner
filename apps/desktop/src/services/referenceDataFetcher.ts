import { STORAGE_KEYS } from '../constants/storage';
import {
  type AppFaqSection,
  type GlossaryCategory,
  type GlossaryTerm,
  type ReferenceDataEnvelope,
  type ReferenceDataIndexResponse,
  type ReferenceDataPayload,
  type ReferenceDataResourceMeta,
  type ReferenceDataResourceName,
  type USStateHeuristicRuleSet,
  type USFederalTaxRuleSet,
} from '../types/referenceData';

const CACHE_KEY = STORAGE_KEYS.referenceData;
const RESOURCE_NAMES: ReferenceDataResourceName[] = ['usTaxData', 'glossary', 'appFaqs'];

type SerializedBand = { upTo: number | null; rate: number };

type SerializedUsTaxData = {
  federal: Omit<USFederalTaxRuleSet, 'brackets'> & {
    brackets: {
      single: SerializedBand[];
      married_filing_jointly: SerializedBand[];
    };
  };
  fica: ReferenceDataPayload['usTaxData']['fica'];
  stateHeuristic: Omit<USStateHeuristicRuleSet, 'bands'> & {
    bands: SerializedBand[];
  };
};

type ReferenceDataCacheEnvelope = {
  timestamp: number;
  index: ReferenceDataIndexResponse | null;
  payload: ReferenceDataPayload;
};

const DEFAULT_REFERENCE_DATA: ReferenceDataPayload = {
  usTaxData: {
    federal: {
      taxYear: 2026,
      source: 'API bootstrap defaults',
      sourceLastReviewed: '2026-03-27',
      standardDeduction: {
        single: 16100,
        married_filing_jointly: 32200,
      },
      brackets: {
        single: [
          { upTo: 12400, rate: 0.1 },
          { upTo: 50400, rate: 0.12 },
          { upTo: 105700, rate: 0.22 },
          { upTo: 201775, rate: 0.24 },
          { upTo: 256225, rate: 0.32 },
          { upTo: 640600, rate: 0.35 },
          { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
        ],
        married_filing_jointly: [
          { upTo: 24800, rate: 0.1 },
          { upTo: 100800, rate: 0.12 },
          { upTo: 211400, rate: 0.22 },
          { upTo: 403550, rate: 0.24 },
          { upTo: 512450, rate: 0.32 },
          { upTo: 768700, rate: 0.35 },
          { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
        ],
      },
    },
    fica: {
      taxYear: 2026,
      socialSecurityEmployeeRate: 0.062,
      socialSecurityWageBase: 176100,
      medicareEmployeeRate: 0.0145,
      medicareAdditionalRate: 0.009,
      medicareAdditionalThresholdSingle: 200000,
      medicareAdditionalThresholdMarried: 250000,
    },
    stateHeuristic: {
      taxYear: 2026,
      source: 'API bootstrap defaults',
      bands: [
        { upTo: 30000, rate: 3.5 },
        { upTo: 60000, rate: 4.5 },
        { upTo: 100000, rate: 5.5 },
        { upTo: 160000, rate: 6.5 },
        { upTo: 250000, rate: 7.5 },
        { upTo: Number.POSITIVE_INFINITY, rate: 8.5 },
      ],
    },
  },
  glossary: {
    terms: [],
    categoryLabels: {
      pay: 'Pay',
      taxes: 'Taxes',
      deductions: 'Deductions',
      allocations: 'Allocations',
      retirement: 'Retirement',
      accounts: 'Accounts',
      loans: 'Loans',
    },
  },
  appFaqs: {
    sections: [],
  },
};

const EMPTY_RESOURCE_META: ReferenceDataResourceMeta = {
  version: '',
  hash: '',
};

const EMPTY_INDEX: ReferenceDataIndexResponse = {
  resources: {
    usTaxData: EMPTY_RESOURCE_META,
    glossary: EMPTY_RESOURCE_META,
    appFaqs: EMPTY_RESOURCE_META,
  },
};

let inMemoryReferenceData: ReferenceDataPayload = DEFAULT_REFERENCE_DATA;

let inFlightReferenceRequest: Promise<ReferenceDataPayload> | null = null;

function toUnboundedNumber(value: number | null): number {
  return value === null ? Number.POSITIVE_INFINITY : value;
}

function deserializeUsTaxData(serialized: SerializedUsTaxData): ReferenceDataPayload['usTaxData'] {
  return {
    federal: {
      ...serialized.federal,
      brackets: {
        single: serialized.federal.brackets.single.map((band) => ({
          upTo: toUnboundedNumber(band.upTo),
          rate: band.rate,
        })),
        married_filing_jointly: serialized.federal.brackets.married_filing_jointly.map((band) => ({
          upTo: toUnboundedNumber(band.upTo),
          rate: band.rate,
        })),
      },
    },
    fica: serialized.fica,
    stateHeuristic: {
      ...serialized.stateHeuristic,
      bands: serialized.stateHeuristic.bands.map((band) => ({
        upTo: toUnboundedNumber(band.upTo),
        rate: band.rate,
      })),
    },
  };
}

function getReferenceDataUrl(path: string): string | null {
  try {
    return new URL(path, __API_BASE_URL__).toString();
  } catch {
    return null;
  }
}

function getCachedEnvelopeFromStorage(): ReferenceDataCacheEnvelope | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ReferenceDataCacheEnvelope;
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.payload) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveCachedEnvelopeToStorage(envelope: ReferenceDataCacheEnvelope): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore storage failures; in-memory cache still works.
  }
}

async function fetchIndex(): Promise<ReferenceDataIndexResponse | null> {
  const url = getReferenceDataUrl('/reference-data/index');
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json() as ReferenceDataIndexResponse;
  } catch {
    return null;
  }
}

async function fetchUsTaxData(): Promise<ReferenceDataEnvelope<SerializedUsTaxData> | null> {
  const url = getReferenceDataUrl('/reference-data/us-tax');
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json() as ReferenceDataEnvelope<SerializedUsTaxData>;
  } catch {
    return null;
  }
}

async function fetchGlossaryData(): Promise<ReferenceDataEnvelope<{ terms: GlossaryTerm[]; categoryLabels: Record<GlossaryCategory, string> }> | null> {
  const url = getReferenceDataUrl('/reference-data/glossary');
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json() as ReferenceDataEnvelope<{ terms: GlossaryTerm[]; categoryLabels: Record<GlossaryCategory, string> }>;
  } catch {
    return null;
  }
}

async function fetchAppFaqsData(): Promise<ReferenceDataEnvelope<{ sections: AppFaqSection[] }> | null> {
  const url = getReferenceDataUrl('/reference-data/app-faqs');
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json() as ReferenceDataEnvelope<{ sections: AppFaqSection[] }>;
  } catch {
    return null;
  }
}

export function getCachedReferenceData(): ReferenceDataPayload {
  const cached = getCachedEnvelopeFromStorage();
  if (cached) {
    inMemoryReferenceData = cached.payload;
  }
  return inMemoryReferenceData;
}

export function getCachedUsTaxData(): ReferenceDataPayload['usTaxData'] {
  return getCachedReferenceData().usTaxData;
}

export function getCachedGlossaryTerms(): GlossaryTerm[] {
  return getCachedReferenceData().glossary.terms;
}

export function getCachedGlossaryCategoryLabels(): Record<GlossaryCategory, string> {
  return getCachedReferenceData().glossary.categoryLabels;
}

export function getCachedAppFaqSections(): AppFaqSection[] {
  return getCachedReferenceData().appFaqs.sections;
}

export async function loadReferenceData(forceRefresh = false): Promise<ReferenceDataPayload> {
  if (inFlightReferenceRequest) {
    return inFlightReferenceRequest;
  }

  inFlightReferenceRequest = (async () => {
    const cached = getCachedEnvelopeFromStorage();
    const cachedIndex = cached?.index ?? EMPTY_INDEX;
    if (cached?.payload) {
      inMemoryReferenceData = cached.payload;
    }

    const index = await fetchIndex();
    if (!index) {
      return inMemoryReferenceData;
    }

    const nextPayload: ReferenceDataPayload = {
      usTaxData: inMemoryReferenceData.usTaxData,
      glossary: inMemoryReferenceData.glossary,
      appFaqs: inMemoryReferenceData.appFaqs,
    };
    const nextIndex: ReferenceDataIndexResponse = {
      resources: {
        usTaxData: cachedIndex.resources.usTaxData,
        glossary: cachedIndex.resources.glossary,
        appFaqs: cachedIndex.resources.appFaqs,
      },
    };

    for (const resourceName of RESOURCE_NAMES) {
      const remoteMeta = index.resources[resourceName];
      const localMeta = cachedIndex.resources[resourceName];
      const hasChanged = forceRefresh
        || !localMeta
        || localMeta.hash !== remoteMeta.hash
        || localMeta.version !== remoteMeta.version;

      if (!hasChanged) {
        nextIndex.resources[resourceName] = remoteMeta;
        continue;
      }

      if (resourceName === 'usTaxData') {
        const response = await fetchUsTaxData();
        if (response) {
          nextPayload.usTaxData = deserializeUsTaxData(response.data);
          nextIndex.resources.usTaxData = {
            version: response.version,
            hash: response.hash,
          };
        }
        continue;
      }

      if (resourceName === 'glossary') {
        const response = await fetchGlossaryData();
        if (response) {
          nextPayload.glossary = {
            terms: response.data.terms,
            categoryLabels: response.data.categoryLabels,
          };
          nextIndex.resources.glossary = {
            version: response.version,
            hash: response.hash,
          };
        }
        continue;
      }

      const response = await fetchAppFaqsData();
      if (response) {
        nextPayload.appFaqs = {
          sections: response.data.sections,
        };
        nextIndex.resources.appFaqs = {
          version: response.version,
          hash: response.hash,
        };
      }
    }

    inMemoryReferenceData = nextPayload;
    saveCachedEnvelopeToStorage({
      timestamp: Date.now(),
      index: nextIndex,
      payload: nextPayload,
    });
    return inMemoryReferenceData;
  })().finally(() => {
    inFlightReferenceRequest = null;
  });

  return inFlightReferenceRequest;
}

export function primeReferenceDataCache(): void {
  // Launch-time hydration: eagerly fetch all reference resources and cache them.
  void loadReferenceData(true);
}
