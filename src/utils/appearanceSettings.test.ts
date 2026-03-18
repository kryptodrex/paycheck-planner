import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FONT_SCALE,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
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
