// Theme Context - Manages light/dark mode preference
import React, { createContext, useContext, useState, useEffect } from 'react';
import { APP_CUSTOM_EVENTS } from '../constants/events';
import { STORAGE_KEYS } from '../constants/storage';
import {
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeThemeMode,
} from '../utils/appearanceSettings';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const getCurrentSettings = () => {
    const settingsStr = localStorage.getItem(STORAGE_KEYS.settings);
    if (!settingsStr) {
      return {
        themeMode: 'light' as const,
        highContrastMode: false,
        fontScale: 1,
      };
    }

    try {
      const settings = JSON.parse(settingsStr) as {
        themeMode?: 'light' | 'dark' | 'system';
        highContrastMode?: boolean;
        fontScale?: number;
      };

      return {
        themeMode: normalizeThemeMode(settings.themeMode) || 'light',
        highContrastMode: normalizeHighContrastMode(settings.highContrastMode),
        fontScale: normalizeFontScale(settings.fontScale),
      };
    } catch {
      return {
        themeMode: 'light' as const,
        highContrastMode: false,
        fontScale: 1,
      };
    }
  };

  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const settings = getCurrentSettings();
    if (settings.themeMode === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    if (settings.themeMode === 'light' || settings.themeMode === 'dark') {
      return settings.themeMode;
    }
    
    // Fallback: check stored theme
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Default to light mode for consistency
    return 'light';
  });

  const [highContrastMode, setHighContrastMode] = useState<boolean>(() => getCurrentSettings().highContrastMode);
  const [fontScale, setFontScale] = useState<number>(() => getCurrentSettings().fontScale);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-contrast', highContrastMode ? 'high' : 'normal');
    document.documentElement.style.fontSize = `${Math.round(fontScale * 100)}%`;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme, highContrastMode, fontScale]);

  // Listen for system theme changes when in System mode
  useEffect(() => {
    const getCurrentThemeMode = () => getCurrentSettings().themeMode;

    const syncAppearanceFromSettings = () => {
      const settings = getCurrentSettings();
      setHighContrastMode(settings.highContrastMode);
      setFontScale(settings.fontScale);

      if (settings.themeMode === 'light' || settings.themeMode === 'dark') {
        setTheme(settings.themeMode);
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
      }
    };

    let cleanup: (() => void) | null = null;

    const setupSystemListener = () => {
      // Clean up any existing listener
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      const themeMode = getCurrentThemeMode();
      if (themeMode !== 'system') return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        // Only update if we're still in system mode
        if (getCurrentThemeMode() === 'system') {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      cleanup = () => mediaQuery.removeEventListener('change', handleChange);
    };

    // Setup initial listener
    setupSystemListener();
    syncAppearanceFromSettings();

    // Listen for custom events when appearance settings change
    const handleAppearanceSettingsChanged = () => {
      syncAppearanceFromSettings();
      setupSystemListener();
    };

    window.addEventListener(APP_CUSTOM_EVENTS.themeModeChanged, handleAppearanceSettingsChanged);
    window.addEventListener(APP_CUSTOM_EVENTS.appearanceSettingsChanged, handleAppearanceSettingsChanged);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener(APP_CUSTOM_EVENTS.themeModeChanged, handleAppearanceSettingsChanged);
      window.removeEventListener(APP_CUSTOM_EVENTS.appearanceSettingsChanged, handleAppearanceSettingsChanged);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
