import { describe, it, expect } from 'vitest';
import { generateDemoBudgetData, getPaychecksPerYear } from '@paycheck-planner/core';
import { computeSummaryMetrics } from '../src/utils/summaryMetrics';
import {
  upsertById,
  removeById,
  setEnabledById,
  parseAmount,
  amountToInput,
} from '../src/utils/planMutations';

describe('computeSummaryMetrics', () => {
  const plan = generateDemoBudgetData(2026);
  const metrics = computeSummaryMetrics(plan);

  it('annualizes the paycheck breakdown', () => {
    const paychecksPerYear = getPaychecksPerYear(plan.paySettings.payFrequency);
    expect(metrics.paychecksPerYear).toBe(paychecksPerYear);
    expect(metrics.annualNet).toBeCloseTo(metrics.breakdown.netPay * paychecksPerYear, 0);
    expect(metrics.annualGross).toBeGreaterThan(0);
  });

  it('builds allocation bar segments that cover gross pay', () => {
    expect(metrics.barSegments.length).toBeGreaterThan(0);
    const totalPct = metrics.barSegments.reduce((sum, segment) => sum + segment.pct, 0);
    // Segments are percentages of gross; they should approximately fill the bar.
    expect(totalPct).toBeGreaterThan(90);
    expect(totalPct).toBeLessThan(110);
  });

  it('includes a gross row at 100% in the flow rows', () => {
    const grossRow = metrics.flowRows.find((row) => row.key === 'gross');
    expect(grossRow).toBeDefined();
    expect(grossRow?.percentage).toBe(100);
    expect(grossRow?.amount).toBeCloseTo(metrics.annualGross, 2);
  });

  it('computes sensible rates', () => {
    expect(metrics.effectiveTaxRate).toBeGreaterThan(0);
    expect(metrics.effectiveTaxRate).toBeLessThan(100);
    expect(metrics.savingsRate).toBeGreaterThanOrEqual(0);
    expect(metrics.savingsRate).toBeLessThan(100);
  });

  it('counts recurring expense items', () => {
    expect(metrics.recurringExpenseCount).toBeGreaterThan(0);
    expect(metrics.annualRecurringExpenses).toBeGreaterThan(0);
  });
});

describe('plan mutation helpers', () => {
  const items = [
    { id: 'a', name: 'First', enabled: true },
    { id: 'b', name: 'Second', enabled: true },
  ];

  it('upsertById appends new items and replaces existing ones', () => {
    const appended = upsertById(items, { id: 'c', name: 'Third', enabled: true });
    expect(appended).toHaveLength(3);

    const replaced = upsertById(items, { id: 'a', name: 'Renamed', enabled: true });
    expect(replaced).toHaveLength(2);
    expect(replaced[0].name).toBe('Renamed');
  });

  it('upsertById tolerates undefined collections', () => {
    expect(upsertById(undefined, { id: 'x' })).toHaveLength(1);
  });

  it('removeById filters the matching item', () => {
    expect(removeById(items, 'a')).toEqual([items[1]]);
    expect(removeById(undefined, 'a')).toEqual([]);
  });

  it('setEnabledById toggles only the target', () => {
    const toggled = setEnabledById(items, 'b', false);
    expect(toggled[0].enabled).toBe(true);
    expect(toggled[1].enabled).toBe(false);
  });

  it('parseAmount handles valid and invalid input', () => {
    expect(parseAmount('123.45')).toBe(123.45);
    expect(parseAmount('1,5')).toBe(1.5);
    expect(parseAmount('$50')).toBe(50);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('amountToInput round-trips numbers', () => {
    expect(amountToInput(12.345)).toBe('12.35');
    expect(amountToInput(undefined)).toBe('');
    expect(parseAmount(amountToInput(99.99) || '')).toBe(99.99);
  });
});
