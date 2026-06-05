import { describe, it, expect } from 'vitest';
import {
  generateDemoBudgetData,
  calculatePaycheckBreakdown,
  getPaychecksPerYear,
  formatCurrency,
  convertBillToYearly,
} from '@paycheck-planner/core';

describe('core consumption from mobile', () => {
  describe('generateDemoBudgetData', () => {
    it('returns a structurally valid BudgetData', () => {
      const plan = generateDemoBudgetData(2025);
      expect(typeof plan.id).toBe('string');
      expect(plan.year).toBe(2025);
      expect(typeof plan.name).toBe('string');
      expect(Array.isArray(plan.accounts)).toBe(true);
      expect(Array.isArray(plan.bills)).toBe(true);
      expect(Array.isArray(plan.loans)).toBe(true);
      expect(plan.settings.currency).toBe('USD');
    });

    it('respects a custom currency argument', () => {
      const plan = generateDemoBudgetData(2025, 'EUR');
      expect(plan.settings.currency).toBe('EUR');
    });

    it('includes paySettings with a valid payFrequency', () => {
      const plan = generateDemoBudgetData(2025);
      expect(plan.paySettings.payFrequency).toBeTruthy();
      expect(getPaychecksPerYear(plan.paySettings.payFrequency)).toBeGreaterThan(0);
    });

    it('includes tax settings with at least one tax line', () => {
      const plan = generateDemoBudgetData(2025);
      expect(plan.taxSettings.taxLines.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePaycheckBreakdown', () => {
    it('produces a non-zero net pay for a demo plan', () => {
      const plan = generateDemoBudgetData(2025);
      const breakdown = calculatePaycheckBreakdown(plan);
      expect(breakdown.grossPay).toBeGreaterThan(0);
      expect(breakdown.netPay).toBeGreaterThan(0);
      expect(breakdown.netPay).toBeLessThan(breakdown.grossPay);
    });

    it('net pay = gross − preTaxDeductions − totalTaxes (within rounding)', () => {
      const plan = generateDemoBudgetData(2025);
      const b = calculatePaycheckBreakdown(plan);
      const expected = b.grossPay - b.preTaxDeductions - b.totalTaxes;
      expect(Math.abs(b.netPay - expected)).toBeLessThan(0.02);
    });

    it('returns the empty breakdown for null input', () => {
      const b = calculatePaycheckBreakdown(null);
      expect(b.grossPay).toBe(0);
      expect(b.netPay).toBe(0);
    });
  });

  describe('getPaychecksPerYear', () => {
    it.each([
      ['weekly', 52],
      ['bi-weekly', 26],
      ['semi-monthly', 24],
      ['monthly', 12],
    ])('returns %i for %s', (freq, expected) => {
      expect(getPaychecksPerYear(freq)).toBe(expected);
    });
  });

  describe('formatCurrency', () => {
    it('formats USD amounts correctly', () => {
      expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50');
    });

    it('handles zero', () => {
      expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0.00');
    });
  });

  describe('convertBillToYearly', () => {
    it.each([
      ['monthly', 100, 1200],
      ['weekly', 50, 2600],
      ['bi-weekly', 200, 5200],
      ['annually', 500, 500],
    ])('converts %s $%i → $%i annually', (freq, amount, expected) => {
      expect(convertBillToYearly(amount, freq as any)).toBe(expected);
    });
  });
});
