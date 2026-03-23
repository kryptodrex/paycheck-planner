// Theme Context - Manages light/dark mode preference
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_APPEARANCE_PRESET } from '../constants/appearancePresets';
import { APP_CUSTOM_EVENTS } from '../constants/events';
import { STORAGE_KEYS } from '../constants/storage';
import {
  normalizeAppearanceMode,
  normalizeAppearancePreset,
  normalizeColorVisionMode,
  normalizeCustomAppearance,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeStateCueMode,
  normalizeThemeMode,
} from '../utils/appearanceSettings';
import { CUSTOM_THEME_VARIABLES, generateCustomThemeTokens } from '../utils/customTheme';
import type { AppearanceMode, AppearancePreset, ColorVisionMode, CustomAppearanceSettings, StateCueMode, ThemeMode } from '../types/appearance';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  appearanceMode: AppearanceMode;
  appearancePreset: AppearancePreset;
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
        appearanceMode: 'preset' as const,
        appearancePreset: DEFAULT_APPEARANCE_PRESET,
        customAppearance: normalizeCustomAppearance(undefined),
        highContrastMode: false,
        colorVisionMode: 'normal' as const,
        stateCueMode: 'minimal' as const,
        fontScale: 1,
      };
    }

    try {
      const settings = JSON.parse(settingsStr) as {
        themeMode?: ThemeMode;
        appearanceMode?: AppearanceMode;
        appearancePreset?: AppearancePreset;
        customAppearance?: CustomAppearanceSettings;
        highContrastMode?: boolean;
        colorVisionMode?: ColorVisionMode;
        stateCueMode?: StateCueMode;
        fontScale?: number;
      };

      return {
        themeMode: normalizeThemeMode(settings.themeMode) || 'light',
        appearanceMode: normalizeAppearanceMode(settings.appearanceMode),
        appearancePreset: normalizeAppearancePreset(settings.appearancePreset),
        customAppearance: normalizeCustomAppearance(settings.customAppearance),
        highContrastMode: normalizeHighContrastMode(settings.highContrastMode),
        colorVisionMode: normalizeColorVisionMode(settings.colorVisionMode),
        stateCueMode: normalizeStateCueMode(settings.stateCueMode),
        fontScale: normalizeFontScale(settings.fontScale),
      };
    } catch {
      return {
        themeMode: 'light' as const,
        appearanceMode: 'preset' as const,
        appearancePreset: DEFAULT_APPEARANCE_PRESET,
        customAppearance: normalizeCustomAppearance(undefined),
        highContrastMode: false,
        colorVisionMode: 'normal' as const,
        stateCueMode: 'minimal' as const,
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

  const [appearancePreset, setAppearancePreset] = useState<AppearancePreset>(() => getCurrentSettings().appearancePreset);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => getCurrentSettings().appearanceMode);
  const [customAppearance, setCustomAppearance] = useState<CustomAppearanceSettings>(() => getCurrentSettings().customAppearance);
  const [highContrastMode, setHighContrastMode] = useState<boolean>(() => getCurrentSettings().highContrastMode);
  const [colorVisionMode, setColorVisionMode] = useState<ColorVisionMode>(() => getCurrentSettings().colorVisionMode);
  const [stateCueMode, setStateCueMode] = useState<StateCueMode>(() => getCurrentSettings().stateCueMode);
  const [fontScale, setFontScale] = useState<number>(() => getCurrentSettings().fontScale);

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);
    if (appearanceMode === 'preset') {
      root.setAttribute('data-theme-preset', appearancePreset);
      CUSTOM_THEME_VARIABLES.forEach((variable) => {
        root.style.removeProperty(variable);
      });
    } else {
      root.removeAttribute('data-theme-preset');
      const customTokens = generateCustomThemeTokens(theme, customAppearance);
      CUSTOM_THEME_VARIABLES.forEach((variable) => {
        root.style.setProperty(variable, customTokens[variable]);
      });
    }

    root.setAttribute('data-contrast', highContrastMode ? 'high' : 'normal');
    root.setAttribute('data-color-vision', colorVisionMode);
    root.setAttribute('data-state-cues', stateCueMode);
    root.style.fontSize = `${Math.round(fontScale * 100)}%`;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme, appearanceMode, appearancePreset, customAppearance, highContrastMode, colorVisionMode, stateCueMode, fontScale]);

  // Listen for system theme changes when in System mode
  useEffect(() => {
    const getCurrentThemeMode = () => getCurrentSettings().themeMode;

    const syncAppearanceFromSettings = () => {
      const settings = getCurrentSettings();
      setAppearanceMode(settings.appearanceMode);
      setAppearancePreset(settings.appearancePreset);
      setCustomAppearance(settings.customAppearance);
      setHighContrastMode(settings.highContrastMode);
      setColorVisionMode(settings.colorVisionMode);
      setStateCueMode(settings.stateCueMode);
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
    appearanceMode,
    appearancePreset,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
