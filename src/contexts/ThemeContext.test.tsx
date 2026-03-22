import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { STORAGE_KEYS } from '../constants/storage';
import { ThemeProvider } from './ThemeContext';

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preset');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.removeAttribute('data-color-vision');
    document.documentElement.removeAttribute('data-state-cues');
    document.documentElement.style.removeProperty('font-size');
  });

  it('applies color vision mode from stored settings to the document root', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        themeMode: 'dark',
        appearanceMode: 'preset',
        appearancePreset: 'ocean',
        highContrastMode: true,
        colorVisionMode: 'tritanopia',
        stateCueMode: 'minimal',
        fontScale: 1.1,
      }),
    );

    render(
      <ThemeProvider>
        <div>fixture</div>
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-preset')).toBe('ocean');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    expect(document.documentElement.getAttribute('data-color-vision')).toBe('tritanopia');
    expect(document.documentElement.getAttribute('data-state-cues')).toBe('minimal');
    expect(document.documentElement.style.fontSize).toBe('110%');
  });
});