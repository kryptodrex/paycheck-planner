import { useState } from 'react';
import { FileStorageService } from '../services/fileStorage';
import { KeychainService } from '../services/keychainService';

interface EncryptionDialogState {
  title: string;
  message: string;
  actionLabel?: string;
}

interface SaveEncryptionSelectionOptions {
  planId?: string;
  persistAppSettings?: boolean;
  deleteStoredKeyWhenDisabled?: boolean;
}

type SaveEncryptionSelectionResult =
  | { success: true; encryptionEnabled: boolean }
  | { success: false; errorDialog: EncryptionDialogState };

const createMissingKeyError = (): SaveEncryptionSelectionResult => ({
  success: false,
  errorDialog: {
    title: 'Encryption Key Required',
    message: 'Please generate or enter an encryption key.',
  },
});

const createSaveFailure = (message: string): SaveEncryptionSelectionResult => ({
  success: false,
  errorDialog: {
    title: 'Encryption Save Failed',
    message: `Failed to save encryption settings: ${message}`,
    actionLabel: 'Retry',
  },
});

export const useEncryptionSetupFlow = () => {
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateKey = () => {
    const key = FileStorageService.generateEncryptionKey();
    setGeneratedKey(key);
    setUseCustomKey(false);
  };

  const reset = () => {
    setEncryptionEnabled(null);
    setCustomKey('');
    setGeneratedKey('');
    setUseCustomKey(false);
    setIsSaving(false);
  };

  const goBackToSelection = () => {
    setEncryptionEnabled(null);
  };

  const canSaveSelection =
    encryptionEnabled !== null && (encryptionEnabled === false || useCustomKey || Boolean(generatedKey));

  const saveSelection = async (
    options: SaveEncryptionSelectionOptions = {}
  ): Promise<SaveEncryptionSelectionResult> => {
    const { planId, persistAppSettings = false, deleteStoredKeyWhenDisabled = false } = options;

    setIsSaving(true);
    try {
      if (encryptionEnabled) {
        const keyToUse = (useCustomKey ? customKey : generatedKey).trim();
        if (!keyToUse) {
          setIsSaving(false);
          return createMissingKeyError();
        }

        if (planId) {
          await KeychainService.saveKey(planId, keyToUse);
        }

        if (persistAppSettings) {
          const settings = FileStorageService.getAppSettings();
          settings.encryptionEnabled = true;
          FileStorageService.saveAppSettings(settings);
        }

        setIsSaving(false);
        return { success: true, encryptionEnabled: true };
      }

      if (deleteStoredKeyWhenDisabled && planId) {
        await KeychainService.deleteKey(planId);
      }

      if (persistAppSettings) {
        const settings = FileStorageService.getAppSettings();
        settings.encryptionEnabled = false;
        FileStorageService.saveAppSettings(settings);
      }

      setIsSaving(false);
      return { success: true, encryptionEnabled: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setIsSaving(false);
      return createSaveFailure(errorMessage);
    }
  };

  return {
    encryptionEnabled,
    setEncryptionEnabled,
    customKey,
    setCustomKey,
    generatedKey,
    useCustomKey,
    setUseCustomKey,
    isSaving,
    canSaveSelection,
    generateKey,
    reset,
    goBackToSelection,
    saveSelection,
  };
};