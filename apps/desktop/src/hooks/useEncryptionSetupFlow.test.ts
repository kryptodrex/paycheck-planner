import { beforeEach, describe, expect, it, vi } from 'vitest';

const hookState: unknown[] = [];
let hookCursor = 0;

function resetHookCursor() {
  hookCursor = 0;
}

function resetHookState() {
  hookState.length = 0;
  hookCursor = 0;
}

vi.mock('react', () => ({
  useState: <T,>(initialValue: T) => {
    const slot = hookCursor++;

    if (!(slot in hookState)) {
      hookState[slot] = initialValue;
    }

    const setState = (value: T | ((current: T) => T)) => {
      const currentValue = hookState[slot] as T;
      hookState[slot] = typeof value === 'function'
        ? (value as (current: T) => T)(currentValue)
        : value;
    };

    return [hookState[slot] as T, setState] as const;
  },
}));

vi.mock('../services/fileStorage', () => ({
  FileStorageService: {
    generateEncryptionKey: vi.fn(() => 'generated-key-123'),
    getAppSettings: vi.fn(() => ({ themeMode: 'light' })),
    saveAppSettings: vi.fn(),
  },
}));

vi.mock('../services/keychainService', () => ({
  KeychainService: {
    saveKey: vi.fn(),
    deleteKey: vi.fn(),
  },
}));

import { FileStorageService } from '../services/fileStorage';
import { KeychainService } from '../services/keychainService';
import { useEncryptionSetupFlow } from './useEncryptionSetupFlow';

describe('useEncryptionSetupFlow', () => {
  const useTestHook = () => {
    resetHookCursor();
    return useEncryptionSetupFlow();
  };

  beforeEach(() => {
    resetHookState();
    vi.clearAllMocks();
    vi.mocked(FileStorageService.generateEncryptionKey).mockReturnValue('generated-key-123');
    vi.mocked(FileStorageService.getAppSettings).mockReturnValue({ themeMode: 'light' });
  });

  it('generates a new key and switches back to generated mode', () => {
    let hook = useTestHook();

    hook.setUseCustomKey(true);
    hook = useTestHook();

    hook.generateKey();
    hook = useTestHook();

    expect(FileStorageService.generateEncryptionKey).toHaveBeenCalledTimes(1);
    expect(hook.generatedKey).toBe('generated-key-123');
    expect(hook.useCustomKey).toBe(false);
  });

  it('returns a required-key dialog when encryption is enabled without a key', async () => {
    let hook = useTestHook();
    hook.setEncryptionEnabled(true);
    hook = useTestHook();

    const result = await hook.saveSelection({ planId: 'plan-1', persistAppSettings: true });
    hook = useTestHook();

    expect(result).toEqual({
      success: false,
      errorDialog: {
        title: 'Encryption Key Required',
        message: 'Please generate or enter an encryption key.',
      },
    });
    expect(KeychainService.saveKey).not.toHaveBeenCalled();
    expect(hook.isSaving).toBe(false);
  });

  it('saves an enabled selection to keychain and app settings', async () => {
    let hook = useTestHook();
    hook.setEncryptionEnabled(true);
    hook = useTestHook();
    hook.generateKey();
    hook = useTestHook();

    const result = await hook.saveSelection({
      planId: 'plan-1',
      persistAppSettings: true,
      deleteStoredKeyWhenDisabled: true,
    });
    hook = useTestHook();

    expect(result).toEqual({ success: true, encryptionEnabled: true });
    expect(KeychainService.saveKey).toHaveBeenCalledWith('plan-1', 'generated-key-123');
    expect(FileStorageService.saveAppSettings).toHaveBeenCalledWith({
      themeMode: 'light',
      encryptionEnabled: true,
    });
    expect(hook.isSaving).toBe(false);
  });

  it('saves a disabled selection and removes the stored key when requested', async () => {
    let hook = useTestHook();
    hook.setEncryptionEnabled(false);
    hook = useTestHook();

    const result = await hook.saveSelection({
      planId: 'plan-1',
      persistAppSettings: true,
      deleteStoredKeyWhenDisabled: true,
    });

    expect(result).toEqual({ success: true, encryptionEnabled: false });
    expect(KeychainService.deleteKey).toHaveBeenCalledWith('plan-1');
    expect(FileStorageService.saveAppSettings).toHaveBeenCalledWith({
      themeMode: 'light',
      encryptionEnabled: false,
    });
  });

  it('returns a standard save-failure dialog when keychain persistence throws', async () => {
    vi.mocked(KeychainService.saveKey).mockRejectedValue(new Error('Keychain unavailable'));

    let hook = useTestHook();
    hook.setEncryptionEnabled(true);
    hook = useTestHook();
    hook.generateKey();
    hook = useTestHook();

    const result = await hook.saveSelection({ planId: 'plan-1', persistAppSettings: true });
    hook = useTestHook();

    expect(result).toEqual({
      success: false,
      errorDialog: {
        title: 'Encryption Save Failed',
        message: 'Failed to save encryption settings: Keychain unavailable',
        actionLabel: 'Retry',
      },
    });
    expect(hook.isSaving).toBe(false);
  });
});