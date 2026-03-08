// Utility functions for managing dashboard tabs
import type { TabConfig } from '../types/auth';

export type TabId = 'metrics' | 'breakdown' | 'bills' | 'loans' | 'benefits' | 'taxes';

/**
 * Get the default tab configuration
 * All tabs are visible by default, allowing users to hide them as needed
 */
export function getDefaultTabConfigs(): TabConfig[] {
  return [
    {
      id: 'metrics',
      label: 'Key Metrics',
      icon: '📊',
      visible: true,
      order: 0,
      pinned: false,
    },
    {
      id: 'breakdown',
      label: 'Pay Breakdown',
      icon: '💵',
      visible: true,
      order: 1,
      pinned: false,
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: '📋',
      visible: true,
      order: 2,
      pinned: false,
    },
    {
      id: 'loans',
      label: 'Loans',
      icon: '🏦',
      visible: true,
      order: 3,
      pinned: false,
    },
    {
      id: 'benefits',
      label: 'Benefits',
      icon: '🏥',
      visible: true,
      order: 4,
      pinned: false,
    },
    {
      id: 'taxes',
      label: 'Taxes',
      icon: '💰',
      visible: true,
      order: 5,
      pinned: false,
    },
  ];
}

/**
 * Migrate old tab configurations or initialize defaults
 */
export function initializeTabConfigs(existingConfigs?: TabConfig[]): TabConfig[] {
  if (!existingConfigs || existingConfigs.length === 0) {
    return getDefaultTabConfigs();
  }
  
  // Ensure all default tabs exist
  const defaults = getDefaultTabConfigs();
  const existingIds = new Set(existingConfigs.map(t => t.id));
  
  // Add any missing tabs with defaults
  const missingTabs = defaults.filter(t => !existingIds.has(t.id));
  
  return [...existingConfigs, ...missingTabs]
    .sort((a, b) => a.order - b.order);
}

/**
 * Get visible tabs sorted by order
 */
export function getVisibleTabs(configs: TabConfig[]): TabConfig[] {
  return configs
    .filter(t => t.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get hidden tabs sorted by order
 */
export function getHiddenTabs(configs: TabConfig[]): TabConfig[] {
  return configs
    .filter(t => !t.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Update tab visibility
 */
export function toggleTabVisibility(configs: TabConfig[], tabId: string, visible: boolean): TabConfig[] {
  return configs.map(t => 
    t.id === tabId ? { ...t, visible } : t
  );
}

/**
 * Reorder tabs by moving a tab to a new position
 */
export function reorderTabs(configs: TabConfig[], fromIndex: number, toIndex: number): TabConfig[] {
  const visibleTabs = getVisibleTabs(configs);
  const hiddenTabs = configs.filter(t => !t.visible);
  
  const fromTab = visibleTabs[fromIndex];
  const toTab = visibleTabs[toIndex];
  
  if (!fromTab || !toTab) return configs;
  
  // Perform the reorder on visible tabs
  const reordered = [...visibleTabs];
  const [movedTab] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedTab);
  
  // Reassign order values
  const updatedVisible = reordered.map((tab, idx) => ({ ...tab, order: idx }));
  
  // Combine with hidden tabs (keep their original order values)
  return [...updatedVisible, ...hiddenTabs];
}
