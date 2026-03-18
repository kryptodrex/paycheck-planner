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

export type ViewModeOption = {
  value: SelectableViewMode;
  label: string;
};

export function sanitizeFavoriteViewModes(modes: unknown): SelectableViewMode[] {
  if (!Array.isArray(modes)) {
    return [...SELECTABLE_VIEW_MODES];
  }

  const unique = new Set<SelectableViewMode>();
  for (const mode of SELECTABLE_VIEW_MODES) {
    if (modes.includes(mode)) {
      unique.add(mode);
    }
  }

  return unique.size > 0 ? Array.from(unique) : [...SELECTABLE_VIEW_MODES];
}

export function buildViewModeSelectorOptions(
  favorites: unknown,
): ViewModeOption[] {
  const sanitizedFavorites = sanitizeFavoriteViewModes(favorites);

  return SELECTABLE_VIEW_MODES
    .filter((mode) => sanitizedFavorites.includes(mode))
    .map((mode) => ({
      value: mode,
      label: getDisplayModeLabel(mode),
    }));
}
