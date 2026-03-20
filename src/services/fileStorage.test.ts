import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_STORAGE_KEYS, STORAGE_KEYS } from '../constants/storage';
import { FileStorageService } from './fileStorage';
import { toAllocationDisplayAmount } from '../utils/allocationEditor';

describe('FileStorageService', () => {
  beforeEach(() => {
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
      viewModeFavorites: ['weekly', 'monthly'],
    });

    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('super-secret');

    const settings = FileStorageService.getAppSettings();
    expect(settings.encryptionEnabled).toBe(true);
    expect(settings.encryptionKey).toBeUndefined();
    expect(settings.viewModeFavorites).toEqual(['weekly', 'monthly']);
  });

  it('normalizes invalid view mode favorites from stored app settings', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ viewModeFavorites: ['weekly', 'invalid-mode', 'weekly'] }),
    );

    const settings = FileStorageService.getAppSettings();

    expect(settings.viewModeFavorites).toEqual(['weekly']);
  });

  it('normalizes appearance values from stored app settings', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        themeMode: 'invalid-theme',
        appearanceMode: 'wildcard',
        appearancePreset: 'neon-chaos',
        customAppearance: { primaryAccent: 'bad', surfaceTint: '#fff' },
        highContrastMode: 'yes',
        colorVisionMode: 'tetrachromacy',
        stateCueMode: 'verbose',
        fontScale: 7,
      }),
    );

    const settings = FileStorageService.getAppSettings();

    expect(settings.themeMode).toBeUndefined();
    expect(settings.appearanceMode).toBe('preset');
    expect(settings.appearancePreset).toBe('default');
    expect(settings.customAppearance).toEqual({
      primaryAccent: '#667eea',
      surfaceTint: '#eef2ff',
    });
    expect(settings.highContrastMode).toBe(false);
    expect(settings.colorVisionMode).toBe('normal');
    expect(settings.stateCueMode).toBe('enhanced');
    expect(settings.fontScale).toBe(1.25);
  });

  it('normalizes appearance values before persisting app settings', () => {
    FileStorageService.saveAppSettings({
      themeMode: 'system',
      appearanceMode: 'custom',
      appearancePreset: 'forest',
      customAppearance: {
        primaryAccent: '#123456',
        surfaceTint: '#abcdef',
      },
      highContrastMode: false,
      colorVisionMode: 'deuteranopia',
      stateCueMode: 'minimal',
      fontScale: 0.1,
      glossaryTermsEnabled: true,
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!);
    expect(stored.themeMode).toBe('system');
    expect(stored.appearanceMode).toBe('custom');
    expect(stored.appearancePreset).toBe('forest');
    expect(stored.customAppearance).toEqual({
      primaryAccent: '#123456',
      surfaceTint: '#abcdef',
    });
    expect(stored.highContrastMode).toBe(false);
    expect(stored.colorVisionMode).toBe('deuteranopia');
    expect(stored.stateCueMode).toBe('minimal');
    expect(stored.fontScale).toBe(0.9);
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

  it('preserves allocation edit amounts across save and load round trips', async () => {
    const budget = FileStorageService.createEmptyBudget(2026, 'USD');
    budget.settings.encryptionEnabled = false;
    budget.accounts = [
      {
        id: 'acct-1',
        name: 'Checking',
        type: 'checking',
        color: '#3366ff',
        allocationCategories: [
          {
            id: 'cat-1',
            name: 'Flexible Spending',
            amount: 92.312307692308,
          },
        ],
      },
    ];

    await FileStorageService.saveBudget(budget, '/tmp/persisted-roundtrip.ppb');

    const saveBudgetMock = window.electronAPI.saveBudget as unknown as {
      mock: { calls: [string, string][] };
    };
    const [, serialized] = saveBudgetMock.mock.calls.at(-1)!;

    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: {
          saveFileDialog: vi.fn(async () => '/tmp/plan.ppb'),
          saveBudget: vi.fn(async () => ({ success: true })),
          openFileDialog: vi.fn(async () => '/tmp/persisted-roundtrip.ppb'),
          loadBudget: vi.fn(async () => ({ success: true, data: serialized })),
          selectDirectory: vi.fn(async () => '/tmp'),
        },
      },
      configurable: true,
    });

    const loaded = await FileStorageService.loadBudget('/tmp/persisted-roundtrip.ppb');

    expect(loaded?.accounts[0].allocationCategories?.[0].amount).toBe(92.312307692308);
    expect(
      toAllocationDisplayAmount(
        loaded!.accounts[0].allocationCategories![0].amount,
        26,
        'monthly',
      ),
    ).toBe(200.01);
  });

  it('creates default tax lines with percentage mode metadata', () => {
    const budget = FileStorageService.createEmptyBudget(2026, 'USD');

    expect(budget.taxSettings.taxLines).toEqual([
      { id: 'uuid-mock', label: 'Federal Tax', rate: 0, amount: 0, calculationType: 'percentage' },
      { id: 'uuid-mock', label: 'State Tax', rate: 0, amount: 0, calculationType: 'percentage' },
      { id: 'uuid-mock', label: 'Social Security', rate: 6.2, amount: 0, calculationType: 'percentage' },
      { id: 'uuid-mock', label: 'Medicare', rate: 1.45, amount: 0, calculationType: 'percentage' },
    ]);
  });

  it('returns known plan IDs from path mappings', () => {
    localStorage.setItem(STORAGE_KEYS.fileToPlanMapping, JSON.stringify({
      '/plans/a.ppb': 'plan-a',
      '/plans/b.ppb': 'plan-a',
      '/plans/c.ppb': 'plan-c',
    }));

    expect(FileStorageService.getKnownPlanIds().sort()).toEqual(['plan-a', 'plan-c']);
  });

  it('clears all app memory keys while preserving unrelated keys', () => {
    localStorage.setItem(STORAGE_KEYS.settings, '{}');
    localStorage.setItem(STORAGE_KEYS.recentFiles, '[]');
    localStorage.setItem(STORAGE_KEYS.fileToPlanMapping, '{}');
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    localStorage.setItem(STORAGE_KEYS.accounts, '[]');
    localStorage.setItem('paycheck-planner-temp-experimental', '1');
    localStorage.setItem('external-key', 'keep-me');

    FileStorageService.clearAppMemory();

    APP_STORAGE_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(localStorage.getItem('paycheck-planner-temp-experimental')).toBeNull();
    expect(localStorage.getItem('external-key')).toBe('keep-me');
  });

  it('exports app data as a valid JSON envelope containing only global preference keys', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      '{"themeMode":"dark","encryptionEnabled":true,"encryptionKey":"secret","glossaryTermsEnabled":true}',
    );
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    localStorage.setItem(STORAGE_KEYS.accounts, '[{"id":"1","name":"Checking"}]');
    localStorage.setItem('external-key', 'ignore-me');

    const json = FileStorageService.exportAppData();
    const envelope = JSON.parse(json);

    expect(envelope.version).toBe(1);
    expect(envelope.appName).toBe('paycheck-planner');
    expect(typeof envelope.exportedAt).toBe('string');

    // Global preferences must be present
    expect(envelope.data[STORAGE_KEYS.theme]).toBe('dark');

    // Settings blob must exist but plan-specific fields must be stripped
    const settings = JSON.parse(envelope.data[STORAGE_KEYS.settings]);
    expect(settings.themeMode).toBe('dark');
    expect(settings.glossaryTermsEnabled).toBe(true);
    expect(settings.encryptionEnabled).toBeUndefined();
    expect(settings.encryptionKey).toBeUndefined();

    // Plan-specific and foreign keys must be absent
    expect(envelope.data[STORAGE_KEYS.accounts]).toBeUndefined();
    expect(envelope.data['external-key']).toBeUndefined();
  });

  it('imports app data from a valid backup envelope and ignores foreign and plan-specific keys', () => {
    const envelope = JSON.stringify({
      version: 1,
      appName: 'paycheck-planner',
      exportedAt: new Date().toISOString(),
      data: {
        [STORAGE_KEYS.theme]: 'dark',
        [STORAGE_KEYS.settings]: '{"themeMode":"unknown","highContrastMode":"yes","fontScale":10,"encryptionEnabled":true,"encryptionKey":"secret"}',
        [STORAGE_KEYS.accounts]: '[{"id":"1"}]',
        'foreign-key': 'should-be-ignored',
      },
    });

    FileStorageService.importAppData(envelope);

    // Global preferences restored
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');

    // Settings blob restored, but plan-specific fields stripped
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!);
    expect(settings.themeMode).toBeUndefined();
    expect(settings.highContrastMode).toBe(false);
    expect(settings.fontScale).toBe(1.25);
    expect(settings.encryptionEnabled).toBeUndefined();
    expect(settings.encryptionKey).toBeUndefined();

    // Plan-specific and foreign keys must not be written
    expect(localStorage.getItem(STORAGE_KEYS.accounts)).toBeNull();
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
        [STORAGE_KEYS.settings]: '{"themeMode":"dark"}',
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
        [STORAGE_KEYS.theme]: 'dark',
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
        [STORAGE_KEYS.theme]: 'dark',
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

  it('returns cancelled when relink picker is dismissed', async () => {
    Object.assign(window.electronAPI, {
      openFileDialog: vi.fn(async () => null),
    });

    const result = await FileStorageService.relinkMovedBudgetFile('/tmp/missing-plan.budget', 'plan-1');

    expect(result).toEqual({ status: 'cancelled' });
  });

  it('returns mismatch when relink picker chooses a different plan', async () => {
    const otherPlan = FileStorageService.createEmptyBudget(2026, 'USD');
    otherPlan.id = 'different-plan';

    Object.assign(window.electronAPI, {
      openFileDialog: vi.fn(async () => '/tmp/other-plan.budget'),
      loadBudget: vi.fn(async () => ({ success: true, data: JSON.stringify(otherPlan) })),
    });

    const result = await FileStorageService.relinkMovedBudgetFile('/tmp/missing-plan.budget', 'plan-1');

    expect(result.status).toBe('mismatch');
    if (result.status === 'mismatch') {
      expect(result.message).toContain('different plan');
    }
  });

  it('returns success and rewrites stale recent-file metadata when relinking a moved plan', async () => {
    const movedPlan = FileStorageService.createEmptyBudget(2026, 'USD');
    movedPlan.id = 'plan-1';
    movedPlan.name = 'Moved Plan';

    FileStorageService.addRecentFileForPlan('/tmp/missing-plan.budget', 'plan-1');

    Object.assign(window.electronAPI, {
      openFileDialog: vi.fn(async () => '/tmp/moved-plan.budget'),
      loadBudget: vi.fn(async () => ({ success: true, data: JSON.stringify(movedPlan) })),
    });

    const result = await FileStorageService.relinkMovedBudgetFile('/tmp/missing-plan.budget', 'plan-1');

    expect(result).toEqual({
      status: 'success',
      filePath: '/tmp/moved-plan.budget',
      planName: 'moved-plan',
    });

    const recentFiles = FileStorageService.getRecentFiles();
    expect(recentFiles.some((file) => file.filePath === '/tmp/missing-plan.budget')).toBe(false);
    expect(recentFiles.some((file) => file.filePath === '/tmp/moved-plan.budget')).toBe(true);
    expect(FileStorageService.getKnownPlanIdForFile('/tmp/moved-plan.budget')).toBe('plan-1');
  });

  it('throws after repeated bad key attempts for encrypted plan files', async () => {
    const plan = FileStorageService.createEmptyBudget(2026, 'USD');
    const encryptedEnvelope = JSON.stringify({
      format: 'paycheck-planner-encrypted-v1',
      planId: 'plan-1',
      payload: FileStorageService.encrypt(JSON.stringify(plan), 'correct-key'),
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    Object.assign(window.electronAPI, {
      loadBudget: vi.fn(async () => ({ success: true, data: encryptedEnvelope })),
      getKeychainKey: vi.fn(async () => ({ success: true, key: null })),
    });

    vi.spyOn(FileStorageService as unknown as {
      requestEncryptionKeyInput: (message: string) => Promise<string | null>;
    }, 'requestEncryptionKeyInput')
      .mockResolvedValueOnce('wrong-key-1')
      .mockResolvedValueOnce('wrong-key-2')
      .mockResolvedValueOnce('wrong-key-3');

    await expect(FileStorageService.loadBudget('/tmp/encrypted-plan.budget')).rejects.toThrow(
      'Failed to decrypt file after 3 attempts. Please check your encryption key.',
    );

    consoleWarnSpy.mockRestore();
  });
});
