import { describe, expect, it } from 'vitest';
import {
  calculateConservativeBuffer,
  calculateRecommendedBuffer,
  calculateStableAllocation,
} from './accountAllocation';

describe('calculateStableAllocation', () => {
  it('bi-weekly: $1,200/mo × 12 / 26 = $553.85/paycheck', () => {
    expect(calculateStableAllocation(1200, 26)).toBe(553.85);
  });

  it('weekly: $1,200/mo × 12 / 52 = $276.92/paycheck', () => {
    expect(calculateStableAllocation(1200, 52)).toBe(276.92);
  });

  it('monthly (identity): $1,200/mo × 12 / 12 = $1,200/paycheck', () => {
    expect(calculateStableAllocation(1200, 12)).toBe(1200);
  });

  it('semi-monthly: $1,200/mo × 12 / 24 = $600/paycheck', () => {
    expect(calculateStableAllocation(1200, 24)).toBe(600);
  });

  it('returns 0 when monthlyTotal is 0', () => {
    expect(calculateStableAllocation(0, 26)).toBe(0);
  });

  it('returns 0 when paychecksPerYear is 0', () => {
    expect(calculateStableAllocation(1200, 0)).toBe(0);
  });

  it('returns 0 when paychecksPerYear is negative', () => {
    expect(calculateStableAllocation(1200, -1)).toBe(0);
  });

  it('handles fractional monthly totals correctly', () => {
    // $750/mo × 12 / 26 = $346.15
    expect(calculateStableAllocation(750, 26)).toBe(346.15);
  });
});

describe('calculateRecommendedBuffer', () => {
  // allocation rounds to $553.85; $553.85 × 2 = $1,107.70; buffer = $1,200 - $1,107.70 = $92.30
  it('bi-weekly min=2: $1,200 - ($553.85 × 2) = $92.30', () => {
    expect(calculateRecommendedBuffer(1200, 26, 2)).toBe(92.30);
  });

  // allocation rounds to $276.92; $276.92 × 4 = $1,107.68; buffer = $1,200 - $1,107.68 = $92.32
  it('weekly min=4: $1,200 - ($276.92 × 4) = $92.32', () => {
    expect(calculateRecommendedBuffer(1200, 52, 4)).toBe(92.32);
  });

  it('monthly min=1: $1,200 - ($1,200 × 1) = $0', () => {
    expect(calculateRecommendedBuffer(1200, 12, 1)).toBe(0);
  });

  it('semi-monthly min=2: $1,200 - ($600 × 2) = $0', () => {
    expect(calculateRecommendedBuffer(1200, 24, 2)).toBe(0);
  });

  it('returns 0 when monthlyTotal is 0', () => {
    expect(calculateRecommendedBuffer(0, 26, 2)).toBe(0);
  });

  it('clamps to 0 when allocation covers more than the monthly total', () => {
    // If minPaychecks is very large, deposited > monthlyTotal → buffer stays 0
    expect(calculateRecommendedBuffer(100, 26, 100)).toBe(0);
  });
});

describe('calculateConservativeBuffer', () => {
  it('equals one full month total', () => {
    expect(calculateConservativeBuffer(1200)).toBe(1200);
  });

  it('returns 0 for zero monthly total', () => {
    expect(calculateConservativeBuffer(0)).toBe(0);
  });

  it('returns 0 for negative monthly total', () => {
    expect(calculateConservativeBuffer(-50)).toBe(0);
  });

  it('rounds to nearest cent', () => {
    expect(calculateConservativeBuffer(123.456)).toBe(123.46);
  });
});
