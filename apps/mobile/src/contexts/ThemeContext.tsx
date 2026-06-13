import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveColors,
  spacing,
  radius,
  fontSize,
  type AppearancePreset,
  type Theme,
} from '../theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

const APPEARANCE_STORAGE_KEY = 'pp-appearance-v1';

interface StoredAppearance {
  mode?: ThemeMode;
  preset?: AppearancePreset;
}

interface ThemeContextValue extends Theme {
  mode: ThemeMode;
  preset: AppearancePreset;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: AppearancePreset) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const VALID_MODES: ThemeMode[] = ['system', 'light', 'dark'];
const VALID_PRESETS: AppearancePreset[] = [
  'default',
  'ocean',
  'forest',
  'sunset',
  'pink',
  'spreadsheet-core',
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [preset, setPresetState] = useState<AppearancePreset>('default');

  useEffect(() => {
    AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)
      .then((json) => {
        if (!json) return;
        const stored: StoredAppearance = JSON.parse(json);
        if (stored.mode && VALID_MODES.includes(stored.mode)) setModeState(stored.mode);
        if (stored.preset && VALID_PRESETS.includes(stored.preset)) setPresetState(stored.preset);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: StoredAppearance) => {
    AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      setModeState(nextMode);
      persist({ mode: nextMode, preset });
    },
    [persist, preset],
  );

  const setPreset = useCallback(
    (nextPreset: AppearancePreset) => {
      setPresetState(nextPreset);
      persist({ mode, preset: nextPreset });
    },
    [persist, mode],
  );

  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';

  const theme = useMemo<ThemeContextValue>(
    () => ({
      colors: resolveColors(isDark, preset),
      spacing,
      radius,
      fontSize,
      isDark,
      mode,
      preset,
      setMode,
      setPreset,
    }),
    [isDark, mode, preset, setMode, setPreset],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
