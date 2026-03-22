// Utility functions for managing dashboard tabs
import { Banknote, ChartPie, ClipboardList, Landmark, PiggyBank, Scale } from 'lucide-react';
import type { TabConfig } from '../types/tabs';

export type TabId = 'metrics' | 'breakdown' | 'bills' | 'loans' | 'savings' | 'taxes';

export function normalizeLegacyTabId(tabId?: string | null): TabId | null {
  if (!tabId) return null;
  if (tabId === 'benefits') return 'savings';
  if (tabId === 'metrics' || tabId === 'breakdown' || tabId === 'bills' || tabId === 'loans' || tabId === 'savings' || tabId === 'taxes') {
    return tabId;
  }
  return null;
}

/**
 * Get the default tab configuration
 * All tabs are visible by default, allowing users to hide them as needed
 */
export function getDefaultTabConfigs(): TabConfig[] {
  return [
    {
      id: 'metrics',
      label: 'Key Metrics',
      icon: ChartPie,
      visible: true,
      order: 0,
      pinned: false,
    },
    {
      id: 'breakdown',
      label: 'Pay Breakdown',
      icon: Banknote,
      visible: true,
      order: 1,
      pinned: false,
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: ClipboardList,
      visible: true,
      order: 2,
      pinned: false,
    },
    {
      id: 'savings',
      label: 'Savings',
      icon: PiggyBank,
      visible: true,
      order: 3,
      pinned: false,
    },
    {
      id: 'loans',
      label: 'Loans',
      icon: Landmark,
      visible: true,
      order: 4,
      pinned: false,
    },
    {
      id: 'taxes',
      label: 'Taxes',
      icon: Scale,
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
  const defaults = getDefaultTabConfigs();

  if (!existingConfigs || existingConfigs.length === 0) {
    return defaults;
  }

  // Keep user state (visibility/order) but always sync canonical ids, labels, and icons from defaults.
  const defaultsById = new Map<string, TabConfig>(defaults.map((tab) => [tab.id, tab]));
  const mergedById = new Map<string, TabConfig>();

  existingConfigs.forEach((config) => {
    const normalizedId = normalizeLegacyTabId(config.id) || config.id;
    const canonical = defaultsById.get(normalizedId);
    if (!canonical) return;

    mergedById.set(normalizedId, {
      ...canonical,
      ...config,
      id: canonical.id,
      label: canonical.label,
      icon: canonical.icon,
      pinned: config.pinned ?? canonical.pinned,
    });
  });

  const normalized = defaults.map((defaultTab) => mergedById.get(defaultTab.id) || defaultTab);
  return normalized.sort((a, b) => a.order - b.order);
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
