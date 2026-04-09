import { describe, expect, it } from 'vitest';
import { Banknote, ChartPie } from 'lucide-react';
import {
  getDefaultTabConfigs,
  getHiddenTabs,
  getVisibleTabs,
  initializeTabConfigs,
  reorderTabs,
  toggleTabVisibility,
} from './tabManagement';

describe('tabManagement utilities', () => {
  it('returns default tab configs with expected order', () => {
    const defaults = getDefaultTabConfigs();
    expect(defaults).toHaveLength(7);
    expect(defaults.map((tab) => tab.id)).toEqual([
      'metrics',
      'breakdown',
      'other-income',
      'bills',
      'savings',
      'loans',
      'taxes',
    ]);
    expect(defaults.find((tab) => tab.id === 'other-income')?.visible).toBe(false);
    expect(defaults.filter((tab) => tab.id !== 'other-income').every((tab) => tab.visible)).toBe(true);
  });

  it('initializes defaults when no config exists', () => {
    expect(initializeTabConfigs()).toEqual(getDefaultTabConfigs());
    expect(initializeTabConfigs([])).toEqual(getDefaultTabConfigs());
  });

  it('adds missing tabs and keeps configs sorted by order', () => {
    const existing = [
      {
        id: 'metrics',
        label: 'Yearly Metrics',
        icon: ChartPie,
        visible: true,
        order: 10,
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
    ];

    const initialized = initializeTabConfigs(existing);
    expect(initialized).toHaveLength(7);
    expect(initialized[0].id).toBe('breakdown');
    expect(initialized.some((tab) => tab.id === 'taxes')).toBe(true);
    expect(initialized.some((tab) => tab.id === 'other-income')).toBe(true);
  });

  it('returns visible and hidden tabs sorted by order', () => {
    const mixed = toggleTabVisibility(getDefaultTabConfigs(), 'bills', false);
    const visible = getVisibleTabs(mixed);
    const hidden = getHiddenTabs(mixed);

    expect(visible.every((tab) => tab.visible)).toBe(true);
    expect(hidden.every((tab) => !tab.visible)).toBe(true);
    expect(hidden.map((tab) => tab.id)).toEqual(['other-income', 'bills']);
  });

  it('toggles visibility for a specific tab id', () => {
    const updated = toggleTabVisibility(getDefaultTabConfigs(), 'loans', false);
    const loans = updated.find((tab) => tab.id === 'loans');
    expect(loans?.visible).toBe(false);
  });

  it('reorders visible tabs while preserving hidden tabs', () => {
    const withHidden = toggleTabVisibility(getDefaultTabConfigs(), 'taxes', false);
    const withVisibleOtherIncome = toggleTabVisibility(withHidden, 'other-income', true);
    const reordered = reorderTabs(withVisibleOtherIncome, 0, 2);

    const visibleIds = getVisibleTabs(reordered).map((tab) => tab.id);
    const hiddenIds = getHiddenTabs(reordered).map((tab) => tab.id);

    expect(visibleIds).toEqual(['breakdown', 'other-income', 'metrics', 'bills', 'savings', 'loans']);
    expect(hiddenIds).toEqual(['taxes']);
  });
});
