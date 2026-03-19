import { describe, expect, it } from 'vitest';
import { buildViewModeSelectorOptions, DEFAULT_FAVORITE_VIEW_MODES, sanitizeFavoriteViewModes } from './viewModePreferences';

describe('viewModePreferences utilities', () => {
  it('falls back to default favorites when favorites are missing or invalid', () => {
    expect(sanitizeFavoriteViewModes(undefined)).toEqual(DEFAULT_FAVORITE_VIEW_MODES);
    expect(sanitizeFavoriteViewModes('weekly')).toEqual(DEFAULT_FAVORITE_VIEW_MODES);
    expect(sanitizeFavoriteViewModes([])).toEqual(DEFAULT_FAVORITE_VIEW_MODES);
  });

  it('keeps only valid unique favorites in display order', () => {
    const favorites = sanitizeFavoriteViewModes(['yearly', 'weekly', 'weekly', 'invalid']);

    expect(favorites).toEqual(['weekly', 'yearly']);
  });

  it('uses only favorited modes for visible selector options', () => {
    const options = buildViewModeSelectorOptions(['monthly', 'yearly']);

    expect(options.map((option) => option.value)).toEqual(['monthly', 'yearly']);
  });

  it('caps visible favorites and can add a supplemental default for monthly cadence', () => {
    const options = buildViewModeSelectorOptions(['monthly', 'yearly'], 'monthly');

    expect(options.map((option) => option.value)).toEqual(['monthly', 'quarterly', 'yearly']);
  });
});
