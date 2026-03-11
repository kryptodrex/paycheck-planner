import { describe, expect, it } from 'vitest';
import { getDefaultAccountColor, getDefaultAccountIcon } from './accountDefaults';

describe('accountDefaults utilities', () => {
  it('returns expected default colors by account type', () => {
    expect(getDefaultAccountColor('checking')).toBe('#667eea');
    expect(getDefaultAccountColor('savings')).toBe('#f093fb');
    expect(getDefaultAccountColor('investment')).toBe('#4facfe');
    expect(getDefaultAccountColor('other')).toBe('#43e97b');
  });

  it('returns expected default icons by account type', () => {
    expect(getDefaultAccountIcon('checking')).toBe('💳');
    expect(getDefaultAccountIcon('savings')).toBe('💰');
    expect(getDefaultAccountIcon('investment')).toBe('📈');
    expect(getDefaultAccountIcon('other')).toBe('💵');
  });
});
