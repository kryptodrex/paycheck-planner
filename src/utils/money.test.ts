import { describe, expect, it } from 'vitest';
import {
  formatNumberDisplay,
  parseFormattedNumber,
  roundUpAllToCent,
  roundUpToCent,
  sumAndRound,
} from './money';

describe('money utilities', () => {
  it('rounds up to nearest cent', () => {
    expect(roundUpToCent(10.001)).toBe(10.01);
    expect(roundUpToCent(10.005)).toBe(10.01);
    expect(roundUpToCent(10)).toBe(10);
  });

  it('rounds arrays to nearest cent', () => {
    expect(roundUpAllToCent(1.001, 2.199, 3)).toEqual([1.01, 2.2, 3]);
  });

  it('sums values and rounds up', () => {
    expect(sumAndRound(1.001, 2.001)).toBe(3.01);
  });

  it('formats numbers for display', () => {
    expect(formatNumberDisplay(1000.5)).toBe('1,000.50');
    expect(formatNumberDisplay(1005.505)).toBe('1,005.51');
  });

  it('parses formatted numbers', () => {
    expect(parseFormattedNumber('1,234.56')).toBe(1234.56);
    expect(parseFormattedNumber('')).toBe(0);
  });
});
