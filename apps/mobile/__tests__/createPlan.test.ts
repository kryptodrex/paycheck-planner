import { describe, it, expect } from 'vitest';
import { calculatePaycheckBreakdown } from '@paycheck-planner/core';
import { createEmptyPlan } from '../src/utils/createPlan';

describe('createEmptyPlan', () => {
  it('creates a salary plan matching the desktop empty-budget shape', () => {
    const plan = createEmptyPlan({
      name: '2026 Plan',
      year: 2026,
      currency: 'USD',
      payType: 'salary',
      annualSalary: 104000,
      payFrequency: 'bi-weekly',
    });

    expect(plan.id).toBeTruthy();
    expect(plan.name).toBe('2026 Plan');
    expect(plan.year).toBe(2026);
    expect(plan.paySettings.payType).toBe('salary');
    expect(plan.paySettings.annualSalary).toBe(104000);
    expect(plan.paySettings.hourlyRate).toBeUndefined();

    // Desktop default tax lines: Federal, State, Social Security, Medicare
    expect(plan.taxSettings.taxLines).toHaveLength(4);
    expect(plan.taxSettings.taxLines.map((l) => l.label)).toContain('Social Security');

    // Default remainder checking account
    expect(plan.accounts).toHaveLength(1);
    expect(plan.accounts[0].type).toBe('checking');
    expect(plan.accounts[0].isRemainder).toBe(true);

    expect(plan.settings).toMatchObject({ currency: 'USD', locale: 'en-US' });
    expect(plan.metadata?.auditHistory).toEqual([]);
  });

  it('creates an hourly plan with rate and hours', () => {
    const plan = createEmptyPlan({
      name: 'Hourly Plan',
      year: 2026,
      currency: 'EUR',
      payType: 'hourly',
      hourlyRate: 25,
      hoursPerPayPeriod: 80,
      payFrequency: 'bi-weekly',
    });

    expect(plan.paySettings.hourlyRate).toBe(25);
    expect(plan.paySettings.hoursPerPayPeriod).toBe(80);
    expect(plan.paySettings.annualSalary).toBeUndefined();
    expect(plan.settings.currency).toBe('EUR');
  });

  it('produces a plan the core calculation engine accepts', () => {
    const plan = createEmptyPlan({
      name: 'Calc Plan',
      year: 2026,
      currency: 'USD',
      payType: 'salary',
      annualSalary: 52000,
      payFrequency: 'bi-weekly',
    });

    const breakdown = calculatePaycheckBreakdown(plan);
    expect(breakdown.grossPay).toBe(2000);
    // 6.2% SS + 1.45% Medicare on taxable income
    expect(breakdown.totalTaxes).toBeCloseTo(2000 * 0.0765, 1);
    expect(breakdown.netPay).toBeGreaterThan(0);
  });
});
