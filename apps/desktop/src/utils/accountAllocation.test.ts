import { describe, expect, it } from 'vitest';
import {
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
  // Bi-weekly starting Jan 9 2026: months Jan–Apr have 2 paychecks, May and Oct have 3.
  // Alloc = $461.54/paycheck. 4 consecutive short months → trough after Apr = -$307.68.
  // True required buffer = $307.68.
  const biWeeklyJan9 = [2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2];

  it('bi-weekly Jan 9 start: 4 consecutive short months require $307.68', () => {
    expect(calculateRecommendedBuffer(1000, 26, biWeeklyJan9)).toBe(307.68);
  });

  // Weekly starting Jan 9 2026: no more than one 4-paycheck month in a row before
  // a 5-paycheck month rescues it. Single-month shortfall is sufficient ($76.91).
  // Months: Jan=5, Feb=4, Mar=4, Apr=4, May=5, Jun=4, Jul=5, Aug=4, Sep=4, Oct=5, Nov=4, Dec=4
  const weeklyJan9 = [5, 4, 4, 4, 5, 4, 5, 4, 4, 5, 4, 4];

  it('weekly Jan 9 start: single-month shortfall sufficient, buffer = $76.91', () => {
    expect(calculateRecommendedBuffer(1000, 52, weeklyJan9)).toBe(76.91);
  });

  // An even 12×2 bi-weekly-like schedule — always 2 per month, always self-funding.
  it('returns 0 when account is always self-funding', () => {
    // semi-monthly: exactly 2 paychecks every month, alloc = $600, deposit = $1,200, bills = $1,200 → net 0
    const even = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    expect(calculateRecommendedBuffer(1200, 24, even)).toBe(0);
  });

  it('returns 0 when monthlyTotal is 0', () => {
    expect(calculateRecommendedBuffer(0, 26, biWeeklyJan9)).toBe(0);
  });

  it('returns 0 when paychecksPerYear is 0', () => {
    expect(calculateRecommendedBuffer(1000, 0, biWeeklyJan9)).toBe(0);
  });

  it('clamps to 0 when allocation more than covers every month', () => {
    // Large paychecksPerYear → tiny allocation per paycheck, but if every month has
    // enough paychecks to cover the bill, no buffer is needed.
    // 12 months × 10 paychecks each: alloc = $1,000×12/120 = $100; deposit = $1,000 = bills
    const plenty = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    expect(calculateRecommendedBuffer(1000, 120, plenty)).toBe(0);
  });
});

