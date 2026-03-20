import type { BudgetData } from '../../types/budget';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';

function buildSettingsResults(_budgetData: BudgetData): SearchResult[] {
  void _budgetData;
  return [
    {
      id: 'settings-theme',
      title: 'Theme',
      subtitle: 'Switch between light, dark, or system appearance',
      category: 'Settings',
      categoryIcon: '🎨',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-preset',
      title: 'Appearance Preset',
      subtitle: 'Choose a color preset: Purple, Ocean, Forest, Sunset, Slate, Rose',
      category: 'Settings',
      categoryIcon: '🖌️',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-light',
      title: 'Light Mode',
      subtitle: 'Switch to light theme',
      category: 'Settings',
      categoryIcon: '☀️',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-dark',
      title: 'Dark Mode',
      subtitle: 'Switch to dark theme',
      category: 'Settings',
      categoryIcon: '🌙',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-theme-system',
      title: 'System Theme',
      subtitle: 'Follow the operating system appearance preference',
      category: 'Settings',
      categoryIcon: '💻',
      action: { type: 'open-settings', sectionId: 'appearance' },
    },
    {
      id: 'settings-font-scale',
      title: 'Font Scale',
      subtitle: 'Adjust text size for readability',
      category: 'Settings',
      categoryIcon: '🔤',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
    {
      id: 'settings-high-contrast',
      title: 'High Contrast Mode',
      subtitle: 'Increase color contrast for accessibility',
      category: 'Settings',
      categoryIcon: '🔲',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
    {
      id: 'settings-accessibility',
      title: 'Accessibility',
      subtitle: 'Font scale, high contrast, readability options',
      category: 'Settings',
      categoryIcon: '♿',
      action: { type: 'open-settings', sectionId: 'accessibility' },
    },
    {
      id: 'settings-glossary',
      title: 'Glossary Terms',
      subtitle: 'Enable or disable inline term definitions and hover tooltips',
      category: 'Settings',
      categoryIcon: '📖',
      action: { type: 'open-settings', sectionId: 'glossary' },
    },
    {
      id: 'settings-tooltips',
      title: 'Tooltips',
      subtitle: 'Show or hide inline glossary term tooltips',
      category: 'Settings',
      categoryIcon: '💬',
      action: { type: 'open-settings', sectionId: 'glossary' },
    },
    {
      id: 'settings-view-mode',
      title: 'View Mode Favorites',
      subtitle: 'Choose which cadence views appear in the selector: weekly, bi-weekly, monthly…',
      category: 'Settings',
      categoryIcon: '📊',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-weekly',
      title: 'Weekly View',
      subtitle: 'Show amounts on a weekly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-biweekly',
      title: 'Bi-weekly View',
      subtitle: 'Show amounts on a bi-weekly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-view-mode-monthly',
      title: 'Monthly View',
      subtitle: 'Show amounts on a monthly cadence',
      category: 'Settings',
      categoryIcon: '📅',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-backup',
      title: 'Backup & Export Settings',
      subtitle: 'Export or import app settings as a backup',
      category: 'Settings',
      categoryIcon: '💾',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
    {
      id: 'settings-reset',
      title: 'Reset App Data',
      subtitle: 'Clear all app settings and restore defaults',
      category: 'Settings',
      categoryIcon: '🔄',
      action: { type: 'open-settings', sectionId: 'app-data-reset' },
    },
  ];
}

export const settingsSearchModule: SearchModule = {
  id: 'settings',
  buildResults: buildSettingsResults,
  actionHandlers: {},
};
