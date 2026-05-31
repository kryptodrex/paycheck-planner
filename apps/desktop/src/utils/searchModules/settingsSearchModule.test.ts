import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { settingsSearchModule } from './settingsSearchModule';

const budget: BudgetData = {
  id: 'settings-test',
  name: 'Settings Test',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 80000,
    payFrequency: 'bi-weekly',
  },
  preTaxDeductions: [],
  benefits: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  savingsContributions: [],
  loans: [],
  bills: [],
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('settingsSearchModule', () => {
  it('builds settings entries across all settings sections', () => {
    const results = settingsSearchModule.buildResults(budget);

    expect(results.find((r) => r.id === 'settings-theme')?.action).toMatchObject({ type: 'open-settings', sectionId: 'appearance' });
    expect(results.find((r) => r.id === 'settings-accessibility')?.action).toMatchObject({ type: 'open-settings', sectionId: 'accessibility' });
    expect(results.find((r) => r.id === 'settings-glossary')?.action).toMatchObject({ type: 'open-settings', sectionId: 'glossary' });
    expect(results.find((r) => r.id === 'settings-reset')?.action).toMatchObject({ type: 'open-settings', sectionId: 'app-data-reset' });
  });

  it('returns stable set of settings result ids', () => {
    const results = settingsSearchModule.buildResults(budget);

    expect(results.length).toBeGreaterThan(10);
    expect(results.map((r) => r.id)).toContain('settings-view-mode-monthly');
    expect(results.map((r) => r.id)).toContain('settings-high-contrast');
  });
});
