import { DEFAULT_APPEARANCE_PRESET } from '../constants/appearancePresets';
import type { AppSettings } from '../types/settings';
import type { AppearanceMode, AppearancePreset, ColorVisionMode, CustomAppearanceSettings, FontPreference, StateCueMode, ThemeMode } from '../types/appearance';

export const MIN_FONT_SCALE = 0.90;
export const MAX_FONT_SCALE = 1.25;
export const DEFAULT_FONT_SCALE = 1;
export const DEFAULT_FONT_PREFERENCE: FontPreference = 'system';
export const DEFAULT_APPEARANCE_MODE: AppearanceMode = 'preset';
export const DEFAULT_COLOR_VISION_MODE: ColorVisionMode = 'normal';
export const DEFAULT_STATE_CUE_MODE: StateCueMode = 'minimal';
export const DEFAULT_CUSTOM_APPEARANCE: CustomAppearanceSettings = {
  primaryAccent: '#667eea',
  surfaceTint: '#eef2ff',
};

export function isAppearanceThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function isAppearancePreset(value: unknown): value is AppearancePreset {
  return (
    value === 'default' ||
    value === 'ocean' ||
    value === 'forest' ||
    value === 'sunset' ||
    value === 'pink' ||
    value === 'spreadsheet-core'
  );
}

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'preset' || value === 'custom';
}

export function isColorVisionMode(value: unknown): value is ColorVisionMode {
  return value === 'normal' || value === 'protanopia' || value === 'deuteranopia' || value === 'tritanopia';
}

export function isStateCueMode(value: unknown): value is StateCueMode {
  return value === 'enhanced' || value === 'minimal';
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeThemeMode(value: unknown): AppSettings['themeMode'] {
  if (isAppearanceThemeMode(value)) {
    return value;
  }
  return undefined;
}

export function normalizeAppearanceMode(value: unknown): AppearanceMode {
  if (isAppearanceMode(value)) {
    return value;
  }
  return DEFAULT_APPEARANCE_MODE;
}

export function normalizeAppearancePreset(value: unknown): AppearancePreset {
  if (isAppearancePreset(value)) {
    return value;
  }
  return DEFAULT_APPEARANCE_PRESET;
}

export function normalizeCustomAppearance(value: unknown): CustomAppearanceSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_CUSTOM_APPEARANCE };
  }

  const candidate = value as Partial<CustomAppearanceSettings>;
  return {
    primaryAccent: isHexColor(candidate.primaryAccent)
      ? candidate.primaryAccent
      : DEFAULT_CUSTOM_APPEARANCE.primaryAccent,
    surfaceTint: isHexColor(candidate.surfaceTint)
      ? candidate.surfaceTint
      : DEFAULT_CUSTOM_APPEARANCE.surfaceTint,
  };
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

export function normalizeColorVisionMode(value: unknown): ColorVisionMode {
  if (isColorVisionMode(value)) {
    return value;
  }

  return DEFAULT_COLOR_VISION_MODE;
}

export function normalizeStateCueMode(value: unknown): StateCueMode {
  if (isStateCueMode(value)) {
    return value;
  }

  return DEFAULT_STATE_CUE_MODE;
}

export function isFontPreference(value: unknown): value is FontPreference {
  return (
    value === 'system' ||
    value === 'inter' ||
    value === 'verdana' ||
    value === 'atkinson' ||
    value === 'open-dyslexic'
  );
}

export function normalizeFontPreference(value: unknown): FontPreference {
  if (isFontPreference(value)) {
    return value;
  }
  return DEFAULT_FONT_PREFERENCE;
}
