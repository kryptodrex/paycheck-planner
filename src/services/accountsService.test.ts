import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../constants/storage';
import { AccountsService } from './accountsService';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('AccountsService', () => {
  const localStorageMock = new LocalStorageMock();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    localStorageMock.clear();

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: vi.fn(() => 'uuid-mock'),
      },
      configurable: true,
    });
  });

  it('returns default accounts when nothing is stored', () => {
    const accounts = AccountsService.getAccounts();
    expect(accounts).toHaveLength(3);
    expect(accounts.map((a) => a.name)).toEqual(['Investment', 'Savings', 'Checking']);
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEYS.accounts, 'not-json');

    const accounts = AccountsService.getAccounts();

    expect(accounts).toHaveLength(3);
    expect(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) ?? '')).not.toThrow();
  });

  it('adds and persists an account', () => {
    const added = AccountsService.addAccount('  Extra Savings  ', 'savings');
    expect(added.name).toBe('Extra Savings');

    const stored = AccountsService.getAccounts();
    expect(stored.some((a) => a.name === 'Extra Savings')).toBe(true);
  });

  it('does not allow deleting last account', () => {
    const single = [
      { id: '1', name: 'Only', type: 'checking', color: '#000', icon: 'x' },
    ];
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(single));

    expect(AccountsService.deleteAccount('1')).toBe(false);
    expect(AccountsService.getAccounts()).toHaveLength(1);
  });
});
