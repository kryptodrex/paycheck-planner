import { describe, expect, it } from 'vitest';
import { buildViewModeSelectorOptions, sanitizeFavoriteViewModes, SELECTABLE_VIEW_MODES } from './viewModePreferences';

describe('viewModePreferences utilities', () => {
  it('falls back to all selectable modes when favorites are missing or invalid', () => {
    expect(sanitizeFavoriteViewModes(undefined)).toEqual(SELECTABLE_VIEW_MODES);
    expect(sanitizeFavoriteViewModes('weekly')).toEqual(SELECTABLE_VIEW_MODES);
    expect(sanitizeFavoriteViewModes([])).toEqual(SELECTABLE_VIEW_MODES);
  });

  it('keeps only valid unique favorites in display order', () => {
    const favorites = sanitizeFavoriteViewModes(['yearly', 'weekly', 'weekly', 'invalid']);

    expect(favorites).toEqual(['weekly', 'yearly']);
  });

  it('uses only favorited modes for visible selector options', () => {
    const options = buildViewModeSelectorOptions(['monthly', 'yearly']);

    expect(options.map((option) => option.value)).toEqual(['monthly', 'yearly']);
  });
});
