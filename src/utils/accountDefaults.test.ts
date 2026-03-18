import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPE_COLORS } from '../constants/accountPalette';
import { getDefaultAccountColor, getDefaultAccountIcon } from './accountDefaults';

describe('accountDefaults utilities', () => {
  it('returns expected default colors by account type', () => {
    expect(getDefaultAccountColor('checking')).toBe(ACCOUNT_TYPE_COLORS.checking);
    expect(getDefaultAccountColor('savings')).toBe(ACCOUNT_TYPE_COLORS.savings);
    expect(getDefaultAccountColor('investment')).toBe(ACCOUNT_TYPE_COLORS.investment);
    expect(getDefaultAccountColor('other')).toBe(ACCOUNT_TYPE_COLORS.other);
  });

  it('returns expected default icons by account type', () => {
    expect(getDefaultAccountIcon('checking')).toBe('💳');
    expect(getDefaultAccountIcon('savings')).toBe('💰');
    expect(getDefaultAccountIcon('investment')).toBe('📈');
    expect(getDefaultAccountIcon('other')).toBe('💵');
  });
});
