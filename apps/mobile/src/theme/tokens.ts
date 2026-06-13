// Design tokens mirroring the desktop's CSS semantic variable system.
// Each platform maps these to its own rendering primitives.

export const lightColors = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgElevated: '#ffffff',
  bgInput: '#f3f4f6',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textTertiary: '#9ca3af',
  textAccent: '#667eea',
  textInverse: '#ffffff',
  border: '#e5e7eb',
  accentPrimary: '#667eea',
  accentSecondary: '#764ba2',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  segmentBills: '#f093fb',
  segmentTaxes: '#ef4444',
  segmentSavings: '#4ade80',
  segmentRemaining: '#667eea',
  segmentShortfall: '#f59e0b',
};

export const darkColors: typeof lightColors = {
  bgPrimary: '#1a1a1a',
  bgSecondary: '#242424',
  bgElevated: '#2d2d2d',
  bgInput: '#333333',
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textTertiary: '#6b7280',
  textAccent: '#c084fc',
  textInverse: '#111827',
  border: '#374151',
  accentPrimary: '#a855f7',
  accentSecondary: '#764ba2',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  segmentBills: '#d946ef',
  segmentTaxes: '#f87171',
  segmentSavings: '#4ade80',
  segmentRemaining: '#818cf8',
  segmentShortfall: '#fbbf24',
};

// Appearance presets mirror the desktop's [data-theme-preset] CSS overrides
// (apps/desktop/src/index.css + constants/appearancePresets.ts).
export type AppearancePreset =
  | 'default'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'pink'
  | 'spreadsheet-core';

export interface AppearancePresetMeta {
  value: AppearancePreset;
  label: string;
  description: string;
}

export const APPEARANCE_PRESET_OPTIONS: AppearancePresetMeta[] = [
  {
    value: 'default',
    label: 'Paycheck Planner Purple',
    description: 'Indigo and violet with the original Paycheck Planner look.',
  },
  {
    value: 'ocean',
    label: 'Ocean',
    description: 'Deep teal and blue accents with a crisp, cool header.',
  },
  {
    value: 'forest',
    label: 'Forest',
    description: 'Evergreen surfaces with a restrained botanical accent.',
  },
  {
    value: 'sunset',
    label: 'Sunset',
    description: 'Burnt orange and rose tones with warmer emphasis states.',
  },
  {
    value: 'pink',
    label: 'Pretty in Pink',
    description: 'Bold rose and blush accents with a brighter, editorial feel.',
  },
  {
    value: 'spreadsheet-core',
    label: 'Spreadsheet Core',
    description: 'Neutral grays with a plain, low-distraction look.',
  },
];

type PresetOverride = Partial<typeof lightColors>;

const LIGHT_PRESET_OVERRIDES: Record<AppearancePreset, PresetOverride> = {
  default: {},
  ocean: {
    accentPrimary: '#0f766e',
    accentSecondary: '#0369a1',
    textAccent: '#0f766e',
    segmentRemaining: '#0f766e',
  },
  forest: {
    accentPrimary: '#2f6f4f',
    accentSecondary: '#5f7f2f',
    textAccent: '#2f6f4f',
    segmentRemaining: '#2f6f4f',
  },
  sunset: {
    accentPrimary: '#b45309',
    accentSecondary: '#be185d',
    textAccent: '#b45309',
    segmentRemaining: '#b45309',
  },
  pink: {
    accentPrimary: '#be185d',
    accentSecondary: '#db2777',
    textAccent: '#be185d',
    segmentRemaining: '#be185d',
  },
  'spreadsheet-core': {
    bgPrimary: '#f7f7f8',
    bgSecondary: '#efeff1',
    bgInput: '#e7e7ea',
    textPrimary: '#1f2328',
    textAccent: '#374151',
    border: '#d1d5db',
    accentPrimary: '#9aa1aa',
    accentSecondary: '#b3bac4',
    segmentRemaining: '#64748b',
  },
};

const DARK_PRESET_OVERRIDES: Record<AppearancePreset, PresetOverride> = {
  default: {},
  ocean: {
    accentPrimary: '#0284c7',
    accentSecondary: '#67e8f9',
    textAccent: '#67e8f9',
    segmentRemaining: '#0284c7',
  },
  forest: {
    accentPrimary: '#2f855a',
    accentSecondary: '#bef264',
    textAccent: '#bef264',
    segmentRemaining: '#2f855a',
  },
  sunset: {
    accentPrimary: '#c2410c',
    accentSecondary: '#f9a8d4',
    textAccent: '#f9a8d4',
    segmentRemaining: '#c2410c',
  },
  pink: {
    accentPrimary: '#db2777',
    accentSecondary: '#f9a8d4',
    textAccent: '#f9a8d4',
    segmentRemaining: '#db2777',
  },
  'spreadsheet-core': {
    bgPrimary: '#232428',
    bgSecondary: '#2d2f34',
    bgElevated: '#2d2f34',
    bgInput: '#363940',
    textPrimary: '#f5f5f7',
    textSecondary: '#d4d4d8',
    textTertiary: '#a1a1aa',
    textAccent: '#cbd5e1',
    border: '#3f3f46',
    accentPrimary: '#64748b',
    accentSecondary: '#cbd5e1',
    segmentRemaining: '#94a3b8',
  },
};

export function resolveColors(isDark: boolean, preset: AppearancePreset): ColorTokens {
  const base = isDark ? darkColors : lightColors;
  const overrides = (isDark ? DARK_PRESET_OVERRIDES : LIGHT_PRESET_OVERRIDES)[preset] ?? {};
  return { ...base, ...overrides };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;

export const fontSize = {
  xs: 13,
  sm: 15,
  md: 17,
  lg: 20,
  xl: 23,
  xxl: 28,
  xxxl: 36,
} as const;

export type ColorTokens = typeof lightColors;

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  isDark: boolean;
}
