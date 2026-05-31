import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeychainService } from './keychainService';
import { setStorageCompositionForTests } from './storageComposition';

describe('KeychainService', () => {
  const keychainRepo = {
    saveKey: vi.fn(async () => undefined),
    getKey: vi.fn(async () => 'stored-key'),
    deleteKey: vi.fn(async () => undefined),
    keyExists: vi.fn(async () => true),
    getOrCreateKey: vi.fn(async () => 'stored-key'),
  };

  beforeEach(() => {
    keychainRepo.saveKey.mockReset();
    keychainRepo.saveKey.mockResolvedValue(undefined);
    keychainRepo.getKey.mockReset();
    keychainRepo.getKey.mockResolvedValue('stored-key');
    keychainRepo.deleteKey.mockReset();
    keychainRepo.deleteKey.mockResolvedValue(undefined);
    keychainRepo.keyExists.mockReset();
    keychainRepo.keyExists.mockResolvedValue(true);
    keychainRepo.getOrCreateKey.mockReset();
    keychainRepo.getOrCreateKey.mockResolvedValue('stored-key');

    setStorageCompositionForTests({
      keychain: keychainRepo,
      planFiles: {
        loadBudget: vi.fn(async () => ({ success: true, data: '{}' })),
        openFileDialog: vi.fn(async () => null),
        saveFileDialog: vi.fn(async () => null),
        saveBudget: vi.fn(async () => ({ success: true })),
        fileExists: vi.fn(async () => true),
        selectDirectory: vi.fn(async () => null),
      },
      lifecycle: {
        getWindowBounds: vi.fn(async () => ({ width: 1200, height: 800, x: 0, y: 0 })),
        budgetLoaded: vi.fn(async () => undefined),
      },
    });

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

  afterEach(() => {
    setStorageCompositionForTests(null);
  });

  it('saves key through mocked electron keychain bridge', async () => {
    await KeychainService.saveKey('plan-1', 'key-123');
    expect(keychainRepo.saveKey).toHaveBeenCalledWith('plan-1', 'key-123');
  });

  it('retrieves key through mocked electron keychain bridge', async () => {
    const key = await KeychainService.getKey('plan-1');
    expect(key).toBe('stored-key');
    expect(keychainRepo.getKey).toHaveBeenCalledWith('plan-1');
  });

  it('creates and saves key when none exists', async () => {
    keychainRepo.getOrCreateKey.mockResolvedValueOnce('a'.repeat(64));

    const key = await KeychainService.getOrCreateKey('plan-2');

    expect(keychainRepo.getOrCreateKey).toHaveBeenCalledWith('plan-2');
    expect(key).toHaveLength(64);
  });

  it('returns false for keyExists when lookup throws', async () => {
    keychainRepo.getKey.mockRejectedValueOnce(new Error('boom'));

    await expect(KeychainService.keyExists('plan-3')).resolves.toBe(false);
  });

  it('normalizes save errors to user-safe messages', async () => {
    keychainRepo.saveKey.mockRejectedValueOnce('unexpected');

    await expect(KeychainService.saveKey('plan-1', 'key-123')).rejects.toThrow(
      'Failed to save encryption key to keychain'
    );
  });
});
