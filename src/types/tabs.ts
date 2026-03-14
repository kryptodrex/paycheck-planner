export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  order: number;
  pinned: boolean;
}

export type TabPosition = 'top' | 'bottom' | 'left' | 'right';

export type TabDisplayMode = 'icons-only' | 'icons-with-labels';