import { describe, expect, it } from 'vitest';
import { fromDisplayAmount, monthlyToDisplayAmount, toDisplayAmount } from './displayAmounts';

describe('displayAmounts utilities', () => {
  it('converts per-paycheck amounts to each display mode', () => {
    expect(toDisplayAmount(100, 26, 'paycheck')).toBe(100);
    expect(toDisplayAmount(100, 26, 'monthly')).toBe(216.67);
    expect(toDisplayAmount(100, 26, 'yearly')).toBe(2600);
  });

  it('converts display amounts back to per-paycheck values', () => {
    expect(fromDisplayAmount(100, 26, 'paycheck')).toBe(100);
    expect(fromDisplayAmount(216.67, 26, 'monthly')).toBeCloseTo(100, 2);
    expect(fromDisplayAmount(2600, 26, 'yearly')).toBe(100);
  });

  it('converts monthly amounts into the requested display mode', () => {
    expect(monthlyToDisplayAmount(200, 26, 'monthly')).toBe(200);
    expect(monthlyToDisplayAmount(200, 26, 'paycheck')).toBeCloseTo(92.31, 2);
    expect(monthlyToDisplayAmount(200, 26, 'yearly')).toBe(2400);
  });
});