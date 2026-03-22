import { describe, expect, it } from 'vitest';
import type { BudgetData } from '../../types/budget';
import { paySettingsSearchModule } from './paySettingsSearchModule';

const salaryBudget: BudgetData = {
  id: 'pay-settings-salary',
  name: 'Pay Settings Salary',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 78000,
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

describe('paySettingsSearchModule', () => {
  it('builds salary-based pay settings entries', () => {
    const results = paySettingsSearchModule.buildResults(salaryBudget);

    expect(results.find((r) => r.id === 'pay-settings-annual-pay')).toBeDefined();
    expect(results.find((r) => r.id === 'pay-settings-pay-frequency')).toBeDefined();
    expect(results.find((r) => r.id === 'pay-settings-hourly-rate')).toBeUndefined();
  });

  it('includes hourly-rate entry when pay type is hourly', () => {
    const hourlyBudget: BudgetData = {
      ...salaryBudget,
      id: 'pay-settings-hourly',
      paySettings: {
        payType: 'hourly',
        hourlyRate: 42,
        hoursPerPayPeriod: 80,
        payFrequency: 'bi-weekly',
      },
    };

    const results = paySettingsSearchModule.buildResults(hourlyBudget);
    const hourlyRate = results.find((r) => r.id === 'pay-settings-hourly-rate');

    expect(hourlyRate).toBeDefined();
    expect(hourlyRate?.subtitle).toContain('/hr');
  });
});
