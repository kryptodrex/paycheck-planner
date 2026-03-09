import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageService } from './fileStorage';

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

describe('FileStorageService', () => {
  const localStorageMock = new LocalStorageMock();

  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: vi.fn(() => 'uuid-mock'),
        getRandomValues: (arr: Uint8Array) => {
          arr.fill(0x11);
          return arr;
        },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: {
          saveFileDialog: vi.fn(async () => '/tmp/plan.ppb'),
          saveBudget: vi.fn(async () => ({ success: true })),
          openFileDialog: vi.fn(async () => '/tmp/plan.ppb'),
          loadBudget: vi.fn(async () => ({ success: false, error: 'not used' })),
          selectDirectory: vi.fn(async () => '/tmp'),
        },
      },
      configurable: true,
    });
  });

  it('saves app settings without persisting encryption key', () => {
    FileStorageService.saveAppSettings({
      encryptionEnabled: true,
      encryptionKey: 'super-secret',
      lastOpenedFile: '/tmp/file',
    });

    const raw = localStorage.getItem('paycheck-planner-settings');
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('super-secret');

    const settings = FileStorageService.getAppSettings();
    expect(settings.encryptionEnabled).toBe(true);
    expect(settings.encryptionKey).toBeUndefined();
  });

  it('adds and de-duplicates recent files', () => {
    FileStorageService.addRecentFile('/a/first.ppb');
    FileStorageService.addRecentFile('/a/second.ppb');
    FileStorageService.addRecentFile('/a/first.ppb');

    const recents = FileStorageService.getRecentFiles();
    expect(recents).toHaveLength(2);
    expect(recents[0].filePath).toBe('/a/first.ppb');
  });

  it('encrypts and decrypts data with the same key', () => {
    const key = 'test-key';
    const payload = '{"name":"Plan"}';
    const encrypted = FileStorageService.encrypt(payload, key);

    expect(encrypted).not.toBe(payload);
    expect(FileStorageService.decrypt(encrypted, key)).toBe(payload);
  });

  it('saves budget through mocked electron bridge without writing real files', async () => {
    const budget = FileStorageService.createEmptyBudget(2026, 'USD');
    budget.settings.encryptionEnabled = false;

    const path = await FileStorageService.saveBudget(budget, '/tmp/mock-save.ppb');

    expect(path).toBe('/tmp/mock-save.ppb');
    expect(window.electronAPI.saveBudget).toHaveBeenCalledTimes(1);
    const saveBudgetMock = window.electronAPI.saveBudget as unknown as {
      mock: { calls: [string, string][] };
    };
    const [, serialized] = saveBudgetMock.mock.calls[0];
    expect(serialized).not.toContain('encryptionKey');
  });
});
