export type ThemeMode = 'light' | 'dark' | 'system';

export type AppearanceMode = 'preset' | 'custom';

export type AppearancePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'pink' | 'spreadsheet-core';

export interface CustomAppearanceSettings {
  primaryAccent: string;
  surfaceTint: string;
}