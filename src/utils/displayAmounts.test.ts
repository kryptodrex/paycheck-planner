import { describe, expect, it } from 'vitest';
import { fromDisplayAmount, monthlyToDisplayAmount, toDisplayAmount } from './displayAmounts';

describe('displayAmounts utilities', () => {
  it('converts per-paycheck amounts to each display mode', () => {
    expect(toDisplayAmount(100, 26, 'paycheck')).toBe(100);
    expect(toDisplayAmount(100, 26, 'weekly')).toBe(50);
    expect(toDisplayAmount(100, 26, 'bi-weekly')).toBe(100);
    expect(toDisplayAmount(100, 26, 'semi-monthly')).toBe(108.33);
    expect(toDisplayAmount(100, 26, 'monthly')).toBe(216.67);
    expect(toDisplayAmount(100, 26, 'quarterly')).toBe(650);
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

  it('keeps monthly edits stable when converted to stored values and displayed again', () => {
    const storedAmount = fromDisplayAmount(200.01, 26, 'monthly');

    expect(storedAmount).toBe(92.312307692308);
    expect(toDisplayAmount(storedAmount, 26, 'monthly')).toBe(200.01);
  });

  it('keeps yearly edits stable when converted to stored values and displayed again', () => {
    const storedAmount = fromDisplayAmount(2600.17, 26, 'yearly');

    expect(storedAmount).toBe(100.006538461538);
    expect(toDisplayAmount(storedAmount, 26, 'yearly')).toBe(2600.17);
  });
});