import { describe, expect, it } from 'vitest';
import {
  fromAllocationDisplayAmount,
  normalizeStoredAllocationAmount,
  toAllocationDisplayAmount,
} from './allocationEditor';

describe('allocationEditor utilities', () => {
  it('keeps monthly allocation edits stable across stored-value round trips', () => {
    const storedAmount = fromAllocationDisplayAmount(200.01, 26, 'monthly');

    expect(storedAmount).toBe(92.312307692308);
    expect(toAllocationDisplayAmount(storedAmount, 26, 'monthly')).toBe(200.01);
  });

  it('keeps yearly allocation edits stable across stored-value round trips', () => {
    const storedAmount = fromAllocationDisplayAmount(1234.56, 26, 'yearly');

    expect(storedAmount).toBe(47.483076923077);
    expect(toAllocationDisplayAmount(storedAmount, 26, 'yearly')).toBe(1234.56);
  });

  it('normalizes invalid or negative stored amounts to zero', () => {
    expect(normalizeStoredAllocationAmount(Number.NaN)).toBe(0);
    expect(normalizeStoredAllocationAmount(-15)).toBe(0);
  });
});