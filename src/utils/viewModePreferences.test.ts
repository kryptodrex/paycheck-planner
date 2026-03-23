import { describe, expect, it } from 'vitest';
import { buildViewModeSelectorOptions, DEFAULT_FAVORITE_VIEW_MODES, sanitizeFavoriteViewModes, syncFavoritesForCadence } from './viewModePreferences';

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

describe('syncFavoritesForCadence', () => {
  it('returns null when the cadence mode is already in favorites', () => {
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'quarterly'], 'bi-weekly')).toBeNull();
  });

  it('adds cadence at its canonical position when there is room', () => {
    // monthly(3) + yearly(5) → room for bi-weekly(1) → [bi-weekly, monthly, yearly]
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'bi-weekly')).toEqual(['bi-weekly', 'monthly', 'yearly']);
  });

  it('drops the first existing favorite to make room when at capacity', () => {
    // [monthly, quarterly, yearly] at cap → drop monthly, add bi-weekly → [bi-weekly, quarterly, yearly]
    expect(syncFavoritesForCadence(['monthly', 'quarterly', 'yearly'], 'bi-weekly')).toEqual(['bi-weekly', 'quarterly', 'yearly']);
  });

  it('inserts cadence in canonical order when dropped item is not at position 0', () => {
    // [monthly, yearly] at cap=3? No, only 2 — room available, add quarterly
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'quarterly')).toEqual(['monthly', 'quarterly', 'yearly']);
  });

  it('drops first favorite and respects canonical ordering of the new list', () => {
    // [bi-weekly, monthly, yearly] at cap → drop bi-weekly, add semi-monthly → [semi-monthly, monthly, yearly]
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'yearly'], 'semi-monthly')).toEqual(['semi-monthly', 'monthly', 'yearly']);
  });
});
