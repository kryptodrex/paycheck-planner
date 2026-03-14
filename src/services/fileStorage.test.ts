import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageService } from './fileStorage';

class LocalStorageMock {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
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

  it('returns known plan IDs from path mappings', () => {
    localStorage.setItem('paycheck-planner-file-to-plan-mapping', JSON.stringify({
      '/plans/a.ppb': 'plan-a',
      '/plans/b.ppb': 'plan-a',
      '/plans/c.ppb': 'plan-c',
    }));

    expect(FileStorageService.getKnownPlanIds().sort()).toEqual(['plan-a', 'plan-c']);
  });

  it('clears all app memory keys while preserving unrelated keys', () => {
    localStorage.setItem('paycheck-planner-settings', '{}');
    localStorage.setItem('paycheck-planner-recent-files', '[]');
    localStorage.setItem('paycheck-planner-file-to-plan-mapping', '{}');
    localStorage.setItem('paycheck-planner-theme', 'dark');
    localStorage.setItem('paycheck-planner-accounts', '[]');
    localStorage.setItem('paycheck-planner-temp-experimental', '1');
    localStorage.setItem('external-key', 'keep-me');

    FileStorageService.clearAppMemory();

    expect(localStorage.getItem('paycheck-planner-settings')).toBeNull();
    expect(localStorage.getItem('paycheck-planner-recent-files')).toBeNull();
    expect(localStorage.getItem('paycheck-planner-file-to-plan-mapping')).toBeNull();
    expect(localStorage.getItem('paycheck-planner-theme')).toBeNull();
    expect(localStorage.getItem('paycheck-planner-accounts')).toBeNull();
    expect(localStorage.getItem('paycheck-planner-temp-experimental')).toBeNull();
    expect(localStorage.getItem('external-key')).toBe('keep-me');
  });

  it('exports app data as a valid JSON envelope containing only global preference keys', () => {
    localStorage.setItem(
      'paycheck-planner-settings',
      '{"themeMode":"dark","encryptionEnabled":true,"encryptionKey":"secret","glossaryTermsEnabled":true}',
    );
    localStorage.setItem('paycheck-planner-theme', 'dark');
    localStorage.setItem('paycheck-planner-accounts', '[{"id":"1","name":"Checking"}]');
    localStorage.setItem('external-key', 'ignore-me');

    const json = FileStorageService.exportAppData();
    const envelope = JSON.parse(json);

    expect(envelope.version).toBe(1);
    expect(envelope.appName).toBe('paycheck-planner');
    expect(typeof envelope.exportedAt).toBe('string');

    // Global preferences must be present
    expect(envelope.data['paycheck-planner-theme']).toBe('dark');

    // Settings blob must exist but plan-specific fields must be stripped
    const settings = JSON.parse(envelope.data['paycheck-planner-settings']);
    expect(settings.themeMode).toBe('dark');
    expect(settings.glossaryTermsEnabled).toBe(true);
    expect(settings.encryptionEnabled).toBeUndefined();
    expect(settings.encryptionKey).toBeUndefined();

    // Plan-specific and foreign keys must be absent
    expect(envelope.data['paycheck-planner-accounts']).toBeUndefined();
    expect(envelope.data['external-key']).toBeUndefined();
  });

  it('imports app data from a valid backup envelope and ignores foreign and plan-specific keys', () => {
    const envelope = JSON.stringify({
      version: 1,
      appName: 'paycheck-planner',
      exportedAt: new Date().toISOString(),
      data: {
        'paycheck-planner-theme': 'dark',
        'paycheck-planner-settings': '{"themeMode":"dark","encryptionEnabled":true,"encryptionKey":"secret"}',
        'paycheck-planner-accounts': '[{"id":"1"}]',
        'foreign-key': 'should-be-ignored',
      },
    });

    FileStorageService.importAppData(envelope);

    // Global preferences restored
    expect(localStorage.getItem('paycheck-planner-theme')).toBe('dark');

    // Settings blob restored, but plan-specific fields stripped
    const settings = JSON.parse(localStorage.getItem('paycheck-planner-settings')!);
    expect(settings.themeMode).toBe('dark');
    expect(settings.encryptionEnabled).toBeUndefined();
    expect(settings.encryptionKey).toBeUndefined();

    // Plan-specific and foreign keys must not be written
    expect(localStorage.getItem('paycheck-planner-accounts')).toBeNull();
    expect(localStorage.getItem('foreign-key')).toBeNull();
  });

  it('throws when importing an invalid backup file', () => {
    expect(() => FileStorageService.importAppData('not json')).toThrow('valid JSON');
    expect(() =>
      FileStorageService.importAppData(JSON.stringify({ version: 1, appName: 'other-app', data: {} })),
    ).toThrow('Paycheck Planner settings backup');
  });

  it('rejects opening a settings export file via loadBudget(filePath)', async () => {
    const settingsExportEnvelope = JSON.stringify({
      appName: 'paycheck-planner',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        'paycheck-planner-settings': '{"themeMode":"dark"}',
      },
    });

    Object.assign(window.electronAPI, {
      loadBudget: vi.fn(async () => ({ success: true, data: settingsExportEnvelope })),
    });

    await expect(FileStorageService.loadBudget('/tmp/paycheck-planner-backup.budget')).rejects.toThrow(
      'settings export'
    );
  });

  it('rejects settings export chosen from open file dialog', async () => {
    const settingsExportEnvelope = JSON.stringify({
      appName: 'paycheck-planner',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        'paycheck-planner-theme': 'dark',
      },
    });

    Object.assign(window.electronAPI, {
      openFileDialog: vi.fn(async () => '/tmp/paycheck-planner-backup.budget'),
      loadBudget: vi.fn(async () => ({ success: true, data: settingsExportEnvelope })),
    });

    await expect(FileStorageService.loadBudget()).rejects.toThrow('settings export');
  });

  it('returns invalid status when relink picker chooses settings export file', async () => {
    const settingsExportEnvelope = JSON.stringify({
      appName: 'paycheck-planner',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        'paycheck-planner-theme': 'dark',
      },
    });

    Object.assign(window.electronAPI, {
      openFileDialog: vi.fn(async () => '/tmp/paycheck-planner-backup.budget'),
      loadBudget: vi.fn(async () => ({ success: true, data: settingsExportEnvelope })),
    });

    const result = await FileStorageService.relinkMovedBudgetFile('/tmp/missing-plan.budget', 'plan-1');

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.message).toContain('settings export');
    }
  });
});
