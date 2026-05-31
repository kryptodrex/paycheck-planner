import { describe, expect, it } from 'vitest';
import { buildKeyMetricsSegments } from './keyMetricsSegments';

describe('buildKeyMetricsSegments', () => {
  it('builds bar and flow rows from provided values', () => {
    const { barSegments, flowRows } = buildKeyMetricsSegments({
      annualGross: 100000,
      annualTaxes: 20000,
      annualPreTaxDeductions: 5000,
      annualPostTaxDeductions: 3000,
      annualBillsCoveredByNet: 25000,
      annualSavingsInBar: 10000,
      annualFlexibleRemaining: 37000,
      annualShortfall: 0,
    });

    expect(barSegments.map((s) => s.key)).toEqual([
      'billsAndDeductions',
      'taxes',
      'savings',
      'remaining',
    ]);

    expect(flowRows[0]).toMatchObject({ key: 'gross', amount: 100000, percentage: 100 });
    expect(flowRows.find((row) => row.key === 'taxes')?.percentage).toBeCloseTo(20);
  });

  it('excludes zero-value segments and includes shortfall when present', () => {
    const { barSegments } = buildKeyMetricsSegments({
      annualGross: 50000,
      annualTaxes: 9000,
      annualPreTaxDeductions: 0,
      annualPostTaxDeductions: 0,
      annualBillsCoveredByNet: 25000,
      annualSavingsInBar: 0,
      annualFlexibleRemaining: 0,
      annualShortfall: 1200,
    });

    expect(barSegments.map((s) => s.key)).toEqual(['billsAndDeductions', 'taxes', 'shortfall']);
    expect(barSegments.find((s) => s.key === 'shortfall')?.pct).toBeCloseTo(2.4);
  });

  it('returns zero percentages when gross is zero', () => {
    const { barSegments } = buildKeyMetricsSegments({
      annualGross: 0,
      annualTaxes: 100,
      annualPreTaxDeductions: 50,
      annualPostTaxDeductions: 0,
      annualBillsCoveredByNet: 0,
      annualSavingsInBar: 0,
      annualFlexibleRemaining: 0,
      annualShortfall: 0,
    });

    expect(barSegments.every((segment) => segment.pct === 0)).toBe(true);
  });
});
