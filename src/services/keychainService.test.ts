import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeychainService } from './keychainService';

describe('KeychainService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: {
          saveKeychainKey: vi.fn(async () => ({ success: true })),
          getKeychainKey: vi.fn(async () => ({ success: true, key: 'stored-key' })),
          deleteKeychainKey: vi.fn(async () => ({ success: true })),
        },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          arr.fill(0xab);
          return arr;
        },
      },
      configurable: true,
    });
  });

  it('saves key through mocked electron keychain bridge', async () => {
    await KeychainService.saveKey('plan-1', 'key-123');
    expect(window.electronAPI.saveKeychainKey).toHaveBeenCalledWith(
      'Paycheck Planner',
      'encryption-key:plan-1',
      'key-123'
    );
  });

  it('retrieves key through mocked electron keychain bridge', async () => {
    const key = await KeychainService.getKey('plan-1');
    expect(key).toBe('stored-key');
    expect(window.electronAPI.getKeychainKey).toHaveBeenCalledWith(
      'Paycheck Planner',
      'encryption-key:plan-1'
    );
  });

  it('creates and saves key when none exists', async () => {
    const getSpy = vi
      .spyOn(window.electronAPI, 'getKeychainKey')
      .mockResolvedValueOnce({ success: true, key: undefined });

    const key = await KeychainService.getOrCreateKey('plan-2');

    expect(getSpy).toHaveBeenCalled();
    expect(key).toHaveLength(64);
    expect(window.electronAPI.saveKeychainKey).toHaveBeenCalledTimes(1);
  });

  it('returns false for keyExists when lookup throws', async () => {
    vi.spyOn(window.electronAPI, 'getKeychainKey').mockResolvedValueOnce({
      success: false,
      error: 'boom',
    });

    await expect(KeychainService.keyExists('plan-3')).resolves.toBe(false);
  });
});
