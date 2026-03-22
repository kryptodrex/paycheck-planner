export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorVisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export type StateCueMode = 'enhanced' | 'minimal';

export type AppearanceMode = 'preset' | 'custom';

export type AppearancePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'pink' | 'spreadsheet-core';

export interface CustomAppearanceSettings {
  primaryAccent: string;
  surfaceTint: string;
}