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

export const MAX_VISIBLE_FAVORITE_VIEW_MODES = 3;
export const DEFAULT_FAVORITE_VIEW_MODES: SelectableViewMode[] = ['monthly', 'yearly'];

export type ViewModeOption = {
  value: SelectableViewMode;
  label: string;
};

function getSupplementalFavoriteModeForCadence(
  payCadenceMode?: SelectableViewMode,
): SelectableViewMode | null {
  if (payCadenceMode === 'monthly') {
    return 'quarterly';
  }

  if (payCadenceMode === 'yearly') {
    return 'quarterly';
  }

  return null;
}

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

export function buildViewModeSelectorOptions(
  favorites: unknown,
  payCadenceMode?: SelectableViewMode,
  maxFavorites = MAX_VISIBLE_FAVORITE_VIEW_MODES,
): ViewModeOption[] {
  const sanitizedFavorites = sanitizeFavoriteViewModes(favorites);
  const cappedFavorites = sanitizedFavorites.slice(0, Math.max(maxFavorites, 1));

  if ((payCadenceMode === 'monthly' || payCadenceMode === 'yearly') && cappedFavorites.length < maxFavorites) {
    const supplementalMode = getSupplementalFavoriteModeForCadence(payCadenceMode);
    if (supplementalMode && !cappedFavorites.includes(supplementalMode)) {
      cappedFavorites.push(supplementalMode);
    }
  }

  return SELECTABLE_VIEW_MODES
    .filter((mode) => cappedFavorites.includes(mode))
    .map((mode) => ({
      value: mode,
      label: getDisplayModeLabel(mode),
    }));
}
