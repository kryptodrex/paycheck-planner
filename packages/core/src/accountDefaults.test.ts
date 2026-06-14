import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_ICON_NAMES,
  ACCOUNT_TYPE_ICON_KEYS,
  getDefaultAccountIconKey,
} from './accountDefaults';
import type { Account } from './accounts';

const TYPES: Account['type'][] = ['checking', 'savings', 'investment', 'other'];

describe('account icon defaults', () => {
  it('has a unique, non-empty canonical icon name list', () => {
    expect(ACCOUNT_ICON_NAMES.length).toBeGreaterThan(0);
    expect(new Set(ACCOUNT_ICON_NAMES).size).toBe(ACCOUNT_ICON_NAMES.length);
  });

  it('uses Lucide PascalCase names (shared across desktop/mobile)', () => {
    for (const name of ACCOUNT_ICON_NAMES) {
      expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
    }
  });

  it('maps every account type to a default icon that exists in the canonical list', () => {
    for (const type of TYPES) {
      const icon = getDefaultAccountIconKey(type);
      expect(icon).toBe(ACCOUNT_TYPE_ICON_KEYS[type]);
      expect(ACCOUNT_ICON_NAMES).toContain(icon);
    }
  });
});
