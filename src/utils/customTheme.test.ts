import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../test/colorContrast';
import { generateCustomThemeTokens } from './customTheme';

describe('customTheme', () => {
  it('generates readable light theme tokens from custom colors', () => {
    const tokens = generateCustomThemeTokens('light', {
      primaryAccent: '#0f766e',
      surfaceTint: '#ecfeff',
    });

    expect(tokens['--accent-primary']).toBe('#0f766e');
    expect(tokens['--bg-secondary']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['--bg-tertiary']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['--header-gradient']).toContain('linear-gradient');
    expect(contrastRatio(tokens['--text-accent'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', tokens['--accent-primary'])).toBeGreaterThanOrEqual(4.5);
  });

  it('generates accessible dark theme tokens from custom colors', () => {
    const tokens = generateCustomThemeTokens('dark', {
      primaryAccent: '#0f766e',
      surfaceTint: '#ecfeff',
    });

    expect(tokens['--accent-primary']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['--text-accent']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['--header-gradient']).toContain('linear-gradient');
    expect(contrastRatio(tokens['--text-accent'], '#1a1a1a')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', tokens['--accent-primary'])).toBeGreaterThanOrEqual(3);
  });
});