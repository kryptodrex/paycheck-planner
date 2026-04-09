import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR_VISION_MODE,
  DEFAULT_CUSTOM_APPEARANCE,
  DEFAULT_FONT_PREFERENCE,
  DEFAULT_FONT_SCALE,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
  normalizeAppearanceMode,
  normalizeAppearancePreset,
  normalizeColorVisionMode,
  normalizeCustomAppearance,
  normalizeFontPreference,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeThemeMode,
  DEFAULT_STATE_CUE_MODE,
  normalizeStateCueMode,
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

  it('normalizes color vision mode with default fallback', () => {
    expect(normalizeColorVisionMode('normal')).toBe('normal');
    expect(normalizeColorVisionMode('protanopia')).toBe('protanopia');
    expect(normalizeColorVisionMode('deuteranopia')).toBe('deuteranopia');
    expect(normalizeColorVisionMode('tritanopia')).toBe('tritanopia');
    expect(normalizeColorVisionMode('unknown')).toBe(DEFAULT_COLOR_VISION_MODE);
    expect(normalizeColorVisionMode(undefined)).toBe(DEFAULT_COLOR_VISION_MODE);
  });

  it('normalizes state cue mode with default fallback', () => {
    expect(normalizeStateCueMode('enhanced')).toBe('enhanced');
    expect(normalizeStateCueMode('minimal')).toBe('minimal');
    expect(normalizeStateCueMode('unknown')).toBe(DEFAULT_STATE_CUE_MODE);
    expect(normalizeStateCueMode(undefined)).toBe(DEFAULT_STATE_CUE_MODE);
  });

  it('has correct DEFAULT_FONT_PREFERENCE value', () => {
    expect(DEFAULT_FONT_PREFERENCE).toBe('system');
  });

  it('normalizes font preference with valid keys round-tripping correctly', () => {
    expect(normalizeFontPreference('system')).toBe('system');
    expect(normalizeFontPreference('inter')).toBe('inter');
    expect(normalizeFontPreference('verdana')).toBe('verdana');
    expect(normalizeFontPreference('atkinson')).toBe('atkinson');
    expect(normalizeFontPreference('open-dyslexic')).toBe('open-dyslexic');
  });

  it('normalizes font preference with unknown or missing values to system default', () => {
    expect(normalizeFontPreference('comic-sans')).toBe(DEFAULT_FONT_PREFERENCE);
    expect(normalizeFontPreference(123)).toBe(DEFAULT_FONT_PREFERENCE);
    expect(normalizeFontPreference(undefined)).toBe(DEFAULT_FONT_PREFERENCE);
    expect(normalizeFontPreference(null)).toBe(DEFAULT_FONT_PREFERENCE);
  });
});
