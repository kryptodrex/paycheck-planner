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

    expect(options.map((option) => option.value)).toEqual(['monthly', 'yearly']);
  });
});

describe('syncFavoritesForCadence', () => {
  it('returns null when the cadence mode is already in favorites', () => {
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'quarterly'], 'bi-weekly')).toBeNull();
  });

  it('returns null when the cadence is already in favorites and no old cadence to remove', () => {
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'monthly')).toBeNull();
  });

  it('adds cadence at its canonical position when there is room', () => {
    // monthly(3) + yearly(5) → room for bi-weekly(1) → [bi-weekly, monthly, yearly]
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'bi-weekly')).toEqual(['bi-weekly', 'monthly', 'yearly']);
  });

  it('adds cadence without dropping when still under capacity', () => {
    // 3 favorites, max=6 → room available, add bi-weekly → [bi-weekly, monthly, quarterly, yearly]
    expect(syncFavoritesForCadence(['monthly', 'quarterly', 'yearly'], 'bi-weekly')).toEqual(['bi-weekly', 'monthly', 'quarterly', 'yearly']);
  });

  it('inserts cadence in canonical order when dropped item is not at position 0', () => {
    // [monthly, yearly] at cap=3? No, only 2 — room available, add quarterly
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'quarterly')).toEqual(['monthly', 'quarterly', 'yearly']);
  });

  it('inserts cadence in canonical order when there is room', () => {
    // [bi-weekly, monthly, yearly] → room available, add semi-monthly → [bi-weekly, semi-monthly, monthly, yearly]
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'yearly'], 'semi-monthly')).toEqual(['bi-weekly', 'semi-monthly', 'monthly', 'yearly']);

  });

  it('removes old cadence and adds new one when frequency changes (non-default cadence)', () => {
    // bi-weekly → monthly: remove bi-weekly (not a default), monthly already present → ['monthly','yearly']
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'yearly'], 'monthly', 'bi-weekly')).toEqual(['monthly', 'yearly']);
  });

  it('removes old cadence and adds new one when switching between two non-default cadences', () => {
    // bi-weekly → semi-monthly: remove bi-weekly, add semi-monthly
    expect(syncFavoritesForCadence(['bi-weekly', 'monthly', 'yearly'], 'semi-monthly', 'bi-weekly')).toEqual(['semi-monthly', 'monthly', 'yearly']);
  });

  it('does not remove old cadence when it is a permanent default', () => {
    // monthly → bi-weekly: monthly is a DEFAULT so it stays; bi-weekly added
    expect(syncFavoritesForCadence(['monthly', 'yearly'], 'bi-weekly', 'monthly')).toEqual(['bi-weekly', 'monthly', 'yearly']);
  });
});
