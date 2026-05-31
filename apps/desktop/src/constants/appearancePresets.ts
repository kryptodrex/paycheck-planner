import type { AppearancePreset } from '../types/appearance';

export const DEFAULT_APPEARANCE_PRESET: AppearancePreset = 'default';

export interface AppearancePresetMeta {
  value: AppearancePreset;
  label: string;
  description: string;
  preview: {
    accent: string;
    accentAlt: string;
    surface: string;
    text: string;
  };
}

export const APPEARANCE_PRESET_OPTIONS: AppearancePresetMeta[] = [
  {
    value: 'default',
    label: 'Paycheck Planner Purple',
    description: 'Indigo and violet with the original Paycheck Planner look.',
    preview: {
      accent: '#667eea',
      accentAlt: '#764ba2',
      surface: '#f3f4f6',
      text: '#111827',
    },
  },
  {
    value: 'ocean',
    label: 'Ocean',
    description: 'Deep teal and blue accents with a crisp, cool header.',
    preview: {
      accent: '#0f766e',
      accentAlt: '#0369a1',
      surface: '#ecfeff',
      text: '#082f49',
    },
  },
  {
    value: 'forest',
    label: 'Forest',
    description: 'Evergreen surfaces with a restrained botanical accent.',
    preview: {
      accent: '#2f6f4f',
      accentAlt: '#5f7f2f',
      surface: '#f0fdf4',
      text: '#1f2937',
    },
  },
  {
    value: 'sunset',
    label: 'Sunset',
    description: 'Burnt orange and rose tones with warmer emphasis states.',
    preview: {
      accent: '#b45309',
      accentAlt: '#be185d',
      surface: '#fff7ed',
      text: '#431407',
    },
  },
  {
    value: 'pink',
    label: 'Pretty in Pink',
    description: 'Bold rose and blush accents with a brighter, editorial feel.',
    preview: {
      accent: '#be185d',
      accentAlt: '#db2777',
      surface: '#fdf2f8',
      text: '#500724',
    },
  },
  {
    value: 'spreadsheet-core',
    label: 'Spreadsheet Core',
    description: 'Neutral grays with a plain, low-distraction desktop look.',
    preview: {
      accent: '#9aa1aa',
      accentAlt: '#b3bac4',
      surface: '#f5f5f7',
      text: '#1f2328',
    },
  },
];

export const APPEARANCE_PRESET_MAP = Object.fromEntries(
  APPEARANCE_PRESET_OPTIONS.map((preset) => [preset.value, preset]),
) as Record<AppearancePreset, AppearancePresetMeta>;