const LEFTOVER_SUGGESTION_RATE = 0.2;
const LEFTOVER_SUGGESTION_ROUNDING = 10;
const MIN_LEFTOVER_SUGGESTION = 75;

export function getSuggestedLeftoverPerPaycheck(grossPerPaycheck: number): number {
  if (!Number.isFinite(grossPerPaycheck) || grossPerPaycheck <= 0) {
    return 0;
  }

  const rawSuggestion = grossPerPaycheck * LEFTOVER_SUGGESTION_RATE;
  const rounded = Math.round(rawSuggestion / LEFTOVER_SUGGESTION_ROUNDING) * LEFTOVER_SUGGESTION_ROUNDING;
  return Math.max(MIN_LEFTOVER_SUGGESTION, rounded);
}

export function formatSuggestedLeftover(amount: number, currencyCode: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}