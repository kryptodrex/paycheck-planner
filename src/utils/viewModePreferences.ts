import type { SelectableViewMode } from '../types/viewMode';
import { getDisplayModeLabel } from './payPeriod';

export const SELECTABLE_VIEW_MODES: SelectableViewMode[] = [
  'weekly',
  'bi-weekly',
  'semi-monthly',
  'monthly',
  'quarterly',
  'yearly',
];

export const MAX_VISIBLE_FAVORITE_VIEW_MODES = 6;
export const DEFAULT_FAVORITE_VIEW_MODES: SelectableViewMode[] = ['monthly', 'yearly'];

export type ViewModeOption = {
  value: SelectableViewMode;
  label: string;
};

export function sanitizeFavoriteViewModes(modes: unknown): SelectableViewMode[] {
  if (!Array.isArray(modes)) {
    return [...DEFAULT_FAVORITE_VIEW_MODES];
  }

  const unique = new Set<SelectableViewMode>();
  for (const mode of SELECTABLE_VIEW_MODES) {
    if (modes.includes(mode)) {
      unique.add(mode);
    }
  }

  return unique.size > 0 ? Array.from(unique) : [...DEFAULT_FAVORITE_VIEW_MODES];
}

/**
 * When the pay frequency changes, keep the favorites list in sync:
 * - Removes the previousCadenceMode from favorites when it is not a permanent
 *   default (monthly/yearly) and differs from the new cadence — prevents stale
 *   cadence tabs from lingering after a frequency change.
 * - If the new cadence mode is already in the updated list, returns null (no update needed).
 * - Otherwise inserts the new cadence at its canonical position and returns the
 *   updated list capped at MAX_VISIBLE_FAVORITE_VIEW_MODES.
 */
export function syncFavoritesForCadence(
  currentFavorites: SelectableViewMode[],
  cadenceMode: SelectableViewMode,
  previousCadenceMode?: SelectableViewMode,
): SelectableViewMode[] | null {
  // Remove the old cadence if it differs from the new one and is not a
  // permanent default (monthly/yearly are always useful regardless of cadence).
  let base = currentFavorites;
  if (
    previousCadenceMode &&
    previousCadenceMode !== cadenceMode &&
    !DEFAULT_FAVORITE_VIEW_MODES.includes(previousCadenceMode)
  ) {
    base = currentFavorites.filter((f) => f !== previousCadenceMode);
  }

  if (base.includes(cadenceMode)) {
    // If we removed the old cadence the list changed — return the cleaned-up list.
    return base.length !== currentFavorites.length
      ? sanitizeFavoriteViewModes(base).slice(0, MAX_VISIBLE_FAVORITE_VIEW_MODES)
      : null;
  }

  const finalBase =
    base.length >= MAX_VISIBLE_FAVORITE_VIEW_MODES ? base.slice(1) : base;
  return sanitizeFavoriteViewModes([...finalBase, cadenceMode]).slice(0, MAX_VISIBLE_FAVORITE_VIEW_MODES);
}

export function buildViewModeSelectorOptions(
  favorites: unknown,
  _payCadenceMode?: SelectableViewMode,
  maxFavorites = MAX_VISIBLE_FAVORITE_VIEW_MODES,
): ViewModeOption[] {
  const sanitizedFavorites = sanitizeFavoriteViewModes(favorites);
  const cappedFavorites = sanitizedFavorites.slice(0, Math.max(maxFavorites, 1));
  return SELECTABLE_VIEW_MODES
    .filter((mode) => cappedFavorites.includes(mode))
    .map((mode) => ({
      value: mode,
      label: getDisplayModeLabel(mode),
    }));
}
