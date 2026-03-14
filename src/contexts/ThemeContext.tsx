// Theme Context - Manages light/dark mode preference
import React, { createContext, useContext, useState, useEffect } from 'react';
import { APP_CUSTOM_EVENTS } from '../constants/events';
import { STORAGE_KEYS } from '../constants/storage';
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
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if user has selected system mode
    const settingsStr = localStorage.getItem(STORAGE_KEYS.settings);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings.themeMode === 'system') {
          // Use system preference
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          return systemPrefersDark ? 'dark' : 'light';
        }
        if (settings.themeMode === 'light' || settings.themeMode === 'dark') {
          return settings.themeMode;
        }
      } catch {
        // If parsing fails, fall through to default behavior
      }
    }
    
    // Fallback: check stored theme
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Default to light mode for consistency
    return 'light';
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  // Listen for system theme changes when in System mode
  useEffect(() => {
    const getCurrentThemeMode = () => {
      const settingsStr = localStorage.getItem(STORAGE_KEYS.settings);
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          return settings.themeMode || 'light';
        } catch {
          return 'light';
        }
      }
      return 'light';
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

    // Listen for custom event when theme mode changes
    const handleThemeModeChange = () => {
      setupSystemListener();
    };

    window.addEventListener(APP_CUSTOM_EVENTS.themeModeChanged, handleThemeModeChange);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener(APP_CUSTOM_EVENTS.themeModeChanged, handleThemeModeChange);
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
