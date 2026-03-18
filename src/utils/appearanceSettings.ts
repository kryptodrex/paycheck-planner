import type { AppSettings } from '../types/settings';

export const MIN_FONT_SCALE = 0.90;
export const MAX_FONT_SCALE = 1.25;
export const DEFAULT_FONT_SCALE = 1;

export function isAppearanceThemeMode(value: unknown): value is 'light' | 'dark' | 'system' {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function normalizeThemeMode(value: unknown): AppSettings['themeMode'] {
  if (isAppearanceThemeMode(value)) {
    return value;
  }
  return undefined;
}

export function normalizeFontScale(value: unknown): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SCALE;
  }

  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value as number));
}

export function normalizeHighContrastMode(value: unknown): boolean {
  return value === true;
}
