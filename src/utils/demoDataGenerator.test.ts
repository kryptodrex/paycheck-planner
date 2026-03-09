import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateDemoBudgetData } from './demoDataGenerator';

describe('demoDataGenerator utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a valid demo budget object for the requested year and currency', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const data = generateDemoBudgetData(2026, 'EUR');

    expect(data.year).toBe(2026);
    expect(data.name).toContain('Demo Plan');
    expect(data.settings.currency).toBe('EUR');
    expect(data.settings.locale).toBe('en-US');
    expect(data.paySettings.payFrequency).toBe('semi-monthly');

    expect(data.accounts.length).toBeGreaterThanOrEqual(1);
    expect(data.accounts[0].type).toBe('checking');

    expect(data.bills.length).toBeGreaterThan(0);
    expect(data.bills.every((bill) => bill.amount > 0)).toBe(true);

    expect(data.loans.length).toBeGreaterThanOrEqual(0);
    expect(data.loans.every((loan) => loan.monthlyPayment > 0)).toBe(true);

    expect(Number.isNaN(Date.parse(data.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(data.updatedAt))).toBe(false);
  });
});
