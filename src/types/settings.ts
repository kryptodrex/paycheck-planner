import type { TabConfig, TabDisplayMode, TabPosition } from './tabs';

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
  themeMode?: 'light' | 'dark' | 'system';
  glossaryTermsEnabled?: boolean;
}