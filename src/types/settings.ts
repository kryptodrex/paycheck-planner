import type { TabConfig, TabDisplayMode, TabPosition } from './tabs';
import type { AppearanceMode, AppearancePreset, ColorVisionMode, CustomAppearanceSettings, FontPreference, StateCueMode, ThemeMode } from './appearance';
import type { ViewMode } from './viewMode';

export type KeyMetricsBreakdownView = 'flow' | 'stacked' | 'pie';

export interface BudgetSettings {
  currency: string;
  locale: string;
  filePath?: string;
  lastSavedAt?: string;
  encryptionEnabled?: boolean;
  encryptionKey?: string;
  tabConfigs?: TabConfig[];
  tabPosition?: TabPosition;
  tabDisplayMode?: TabDisplayMode;
  displayMode?: ViewMode;
  windowSize?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  activeTab?: string;
  keyMetricsBreakdownView?: KeyMetricsBreakdownView;
}

export interface AppSettings {
  encryptionEnabled?: boolean;
  encryptionKey?: string;
  lastOpenedFile?: string;
  themeMode?: ThemeMode;
  appearanceMode?: AppearanceMode;
  appearancePreset?: AppearancePreset;
  customAppearance?: CustomAppearanceSettings;
  highContrastMode?: boolean;
  colorVisionMode?: ColorVisionMode;
  stateCueMode?: StateCueMode;
  fontScale?: number;
  fontPreference?: FontPreference;
  glossaryTermsEnabled?: boolean;
}