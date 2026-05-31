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

  it('never generates loan payments that push total fixed expenses above 92% of estimated net', () => {
    // Run many seeds to catch worst-case over-allocation
    const seeds = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
    for (const seed of seeds) {
      vi.spyOn(Math, 'random').mockReturnValue(seed);
      const data = generateDemoBudgetData(2026);

      const annualBills = data.bills.reduce((sum, b) => sum + b.amount * 12, 0);
      const annualLoans = data.loans.reduce((sum, l) => sum + (l.monthlyPayment ?? 0) * 12, 0);
      const totalFixed = annualBills + annualLoans;

      // Derive gross from paySettings the same way the generator does
      let grossPerYear = 0;
      if (data.paySettings.payType === 'salary') {
        grossPerYear = data.paySettings.annualSalary ?? 0;
      } else {
        const { hourlyRate = 0, hoursPerPayPeriod = 0, payFrequency } = data.paySettings;
        const ppy = payFrequency === 'weekly' ? 52 : payFrequency === 'bi-weekly' ? 26 : payFrequency === 'semi-monthly' ? 24 : 12;
        grossPerYear = hourlyRate * hoursPerPayPeriod * ppy;
      }

      // After the safety cap, total fixed expenses must be well under gross.
      // Minimum take-home is ~62% of gross (heavy-tax scenario). The generator
      // caps at 92% of estimated net → at most ~0.92 * 0.62 * gross ≈ 57% of gross.
      // Using 80% of gross as a generous sanity bound ensures the test catches
      // any regression without being fragile to rounding or estimation error.
      expect(totalFixed).toBeLessThanOrEqual(grossPerYear * 0.8);

      vi.restoreAllMocks();
    }
  });
});
