import { describe, expect, it } from 'vitest';
import { formatSuggestedLeftover, getSuggestedLeftoverPerPaycheck } from './paySuggestions';

describe('paySuggestions utilities', () => {
  it('returns zero for invalid or non-positive gross pay', () => {
    expect(getSuggestedLeftoverPerPaycheck(0)).toBe(0);
    expect(getSuggestedLeftoverPerPaycheck(-100)).toBe(0);
    expect(getSuggestedLeftoverPerPaycheck(Number.NaN)).toBe(0);
  });

  it('applies the minimum floor for low gross pay', () => {
    expect(getSuggestedLeftoverPerPaycheck(200)).toBe(75);
    expect(getSuggestedLeftoverPerPaycheck(374)).toBe(75);
  });

  it('rounds to the nearest ten for larger gross pay', () => {
    expect(getSuggestedLeftoverPerPaycheck(1000)).toBe(200);
    expect(getSuggestedLeftoverPerPaycheck(963)).toBe(190);
    expect(getSuggestedLeftoverPerPaycheck(987)).toBe(200);
  });

  it('formats positive suggestions as whole-currency values', () => {
    expect(formatSuggestedLeftover(200, 'USD')).toBe('$200');
  });

  it('returns null for zero or invalid formatted suggestions', () => {
    expect(formatSuggestedLeftover(0, 'USD')).toBeNull();
    expect(formatSuggestedLeftover(Number.NaN, 'USD')).toBeNull();
  });
});