import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client for the public, read-only Paycheck Planner API (`apps/api`): glossary,
 * app FAQs, and currency exchange rates. These endpoints require no auth. Results
 * are network-first with an AsyncStorage cache fallback so reference content
 * still renders offline after a first successful fetch.
 */

export interface GlossaryTerm {
  id: string;
  term: string;
  category: string;
  shortDefinition: string;
  fullDefinition: string;
  aliases?: string[];
  tags?: string[];
  relatedTermIds?: string[];
}

export interface GlossaryData {
  terms: GlossaryTerm[];
  categoryLabels: Record<string, string>;
}

export type AppFaqPlatform = 'desktop' | 'mobile';

export interface AppFaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  /** Platforms this FAQ applies to. Omit when relevant to every platform. */
  platforms?: AppFaqPlatform[];
  /** Optional per-platform answer override (falls back to `answer`). */
  platformAnswers?: Partial<Record<AppFaqPlatform, string>>;
}

export interface AppFaqSection {
  id: string;
  title: string;
  description: string;
  searchTerms: string;
  items: AppFaqItem[];
}

export interface AppFaqData {
  sections: AppFaqSection[];
}

type Envelope<T> = { version: string; hash: string; data: T };

const CACHE_PREFIX = 'pp-refdata-';
const REQUEST_TIMEOUT_MS = 8000;

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromConfig = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  return (fromEnv || fromConfig || 'https://paycheck-planner-api.fly.dev').replace(/\/$/, '');
}

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Network-first fetch of an envelope endpoint, caching `data` for offline use. */
async function loadReference<T>(path: string, cacheKey: string): Promise<T | null> {
  try {
    const envelope = await fetchJson<Envelope<T>>(path);
    await AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(envelope.data)).catch(() => {});
    return envelope.data;
  } catch {
    try {
      const cached = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      return null;
    }
  }
}

export function fetchGlossary(): Promise<GlossaryData | null> {
  return loadReference<GlossaryData>('/reference-data/glossary', 'glossary');
}

const FAQ_PLATFORM: AppFaqPlatform = 'mobile';

/**
 * Keep only FAQ entries that apply to this platform, resolve each to its
 * platform-specific answer when one is provided, and drop sections left empty.
 */
function filterFaqSectionsForPlatform(sections: AppFaqSection[], platform: AppFaqPlatform): AppFaqSection[] {
  return sections
    .map((section) => {
      const items = section.items
        .filter((item) => !item.platforms || item.platforms.includes(platform))
        .map((item) => ({ ...item, answer: item.platformAnswers?.[platform] ?? item.answer }));
      return items.length > 0 ? { ...section, items } : null;
    })
    .filter((section): section is AppFaqSection => section !== null);
}

export async function fetchAppFaqs(): Promise<AppFaqData | null> {
  const data = await loadReference<AppFaqData>('/reference-data/app-faqs', 'app-faqs');
  if (!data) return null;
  return { sections: filterFaqSectionsForPlatform(data.sections, FAQ_PLATFORM) };
}

type FrankfurterResponse = { rates?: Record<string, number> };

/**
 * Fetch the exchange rate to convert 1 unit of `from` into `to` via the API's
 * currency proxy. Returns null on failure or if the rate is missing.
 */
export async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  if (from.toUpperCase() === to.toUpperCase()) return 1;
  try {
    const result = await fetchJson<FrankfurterResponse>(
      `/currency-conversion?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`,
    );
    const rate = result.rates?.[to.toUpperCase()];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}
