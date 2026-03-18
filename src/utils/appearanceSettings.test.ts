import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOM_APPEARANCE,
  DEFAULT_FONT_SCALE,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
  normalizeAppearanceMode,
  normalizeAppearancePreset,
  normalizeCustomAppearance,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeThemeMode,
} from './appearanceSettings';

describe('appearanceSettings', () => {
  it('normalizes theme mode values', () => {
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('system')).toBe('system');
    expect(normalizeThemeMode('invalid')).toBeUndefined();
    expect(normalizeThemeMode(undefined)).toBeUndefined();
  });

  it('normalizes appearance preset values', () => {
    expect(normalizeAppearancePreset('default')).toBe('default');
    expect(normalizeAppearancePreset('ocean')).toBe('ocean');
    expect(normalizeAppearancePreset('forest')).toBe('forest');
    expect(normalizeAppearancePreset('sunset')).toBe('sunset');
    expect(normalizeAppearancePreset('pink')).toBe('pink');
    expect(normalizeAppearancePreset('spreadsheet-core')).toBe('spreadsheet-core');
    expect(normalizeAppearancePreset('unknown')).toBe('default');
    expect(normalizeAppearancePreset(undefined)).toBe('default');
  });

  it('normalizes appearance mode values', () => {
    expect(normalizeAppearanceMode('preset')).toBe('preset');
    expect(normalizeAppearanceMode('custom')).toBe('custom');
    expect(normalizeAppearanceMode('invalid')).toBe('preset');
    expect(normalizeAppearanceMode(undefined)).toBe('preset');
  });

  it('normalizes custom appearance seed colors', () => {
    expect(
      normalizeCustomAppearance({
        primaryAccent: '#112233',
        surfaceTint: '#ddeeff',
      }),
    ).toEqual({
      primaryAccent: '#112233',
      surfaceTint: '#ddeeff',
    });

    expect(
      normalizeCustomAppearance({
        primaryAccent: 'bad',
        surfaceTint: '#fff',
      }),
    ).toEqual(DEFAULT_CUSTOM_APPEARANCE);

    expect(normalizeCustomAppearance(undefined)).toEqual(DEFAULT_CUSTOM_APPEARANCE);
  });

  it('normalizes font scale with clamping and default fallback', () => {
    expect(normalizeFontScale(1)).toBe(1);
    expect(normalizeFontScale(0.8)).toBe(MIN_FONT_SCALE);
    expect(normalizeFontScale(2)).toBe(MAX_FONT_SCALE);
    expect(normalizeFontScale(Number.NaN)).toBe(DEFAULT_FONT_SCALE);
    expect(normalizeFontScale(undefined)).toBe(DEFAULT_FONT_SCALE);
  });

  it('normalizes high contrast mode to strict boolean', () => {
    expect(normalizeHighContrastMode(true)).toBe(true);
    expect(normalizeHighContrastMode(false)).toBe(false);
    expect(normalizeHighContrastMode('true')).toBe(false);
    expect(normalizeHighContrastMode(undefined)).toBe(false);
  });
});
