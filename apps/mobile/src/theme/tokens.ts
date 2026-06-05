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
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type ColorTokens = typeof lightColors;

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  isDark: boolean;
}
