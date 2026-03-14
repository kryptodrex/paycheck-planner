import React, { useState } from 'react';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { useAppDialogs } from '../../../hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button, ErrorDialog, Modal, PillToggle } from '../../_shared';
import { FileStorageService } from '../../../services/fileStorage';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeOption;
  glossaryTermsEnabled: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingMemory, setResettingMemory] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  const [settings, setSettings] = useState<SettingsState>(() => {
    const appSettings = FileStorageService.getAppSettings();
    return {
      themeMode: (appSettings.themeMode as ThemeOption) || 'light',
      glossaryTermsEnabled: appSettings.glossaryTermsEnabled !== false,
    };
  });

  // Always merges with full existing settings so encryptionEnabled is never lost
  const persistSettings = (updated: SettingsState) => {
    const existing = FileStorageService.getAppSettings();
    FileStorageService.saveAppSettings({
      ...existing,
      themeMode: updated.themeMode,
      glossaryTermsEnabled: updated.glossaryTermsEnabled,
    });
  };

  const handleThemeModeChange = (mode: ThemeOption) => {
    setSettings((prev) => {
      const updated = { ...prev, themeMode: mode };
      persistSettings(updated);

      // Update the actual theme based on the mode
      if (mode === 'light' || mode === 'dark') {
        setTheme(mode);
      } else if (mode === 'system') {
        // For system mode, detect the system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
      }

      // Dispatch custom event to notify ThemeProvider
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));

      return updated;
    });
  };

  const handleGlossaryTermsChange = (enabled: boolean) => {
    setSettings((prev) => {
      const updated = { ...prev, glossaryTermsEnabled: enabled };
      persistSettings(updated);
      window.dispatchEvent(new CustomEvent(APP_CUSTOM_EVENTS.glossaryTermsChanged, { detail: { enabled } }));
      return updated;
    });
  };

  const handleExportBackup = async () => {
    setBackingUp(true);
    try {
      const filePath = await window.electronAPI.saveFileDialog('paycheck-planner-backup');
      if (!filePath) return;
      const json = FileStorageService.exportAppData();
      const result = await window.electronAPI.saveBudget(filePath, json);
      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }
      setBackedUp(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      openErrorDialog({
        title: 'Backup Export Failed',
        message: `Failed to export backup: ${message}`,
        actionLabel: 'Retry',
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleImportAppData = async () => {
    setImporting(true);
    try {
      const filePath = await window.electronAPI.openFileDialog();
      if (!filePath) return;
      const result = await window.electronAPI.loadBudget(filePath);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Could not read file');
      }
      FileStorageService.importAppData(result.data);

      // Refresh component's settings state from newly restored values
      const restored = FileStorageService.getAppSettings();
      const newThemeMode = (restored.themeMode as ThemeOption) || 'light';
      const newGlossary = restored.glossaryTermsEnabled !== false;
      setSettings({ themeMode: newThemeMode, glossaryTermsEnabled: newGlossary });

      if (newThemeMode === 'light' || newThemeMode === 'dark') {
        setTheme(newThemeMode);
      } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemDark ? 'dark' : 'light');
      }
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));
      window.dispatchEvent(new CustomEvent(APP_CUSTOM_EVENTS.glossaryTermsChanged, { detail: { enabled: newGlossary } }));
      const reopenResult = await window.electronAPI.reopenWelcomeWindow();
      if (!reopenResult.success) {
        throw new Error(reopenResult.error || 'Failed to reopen welcome window');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      openErrorDialog({
        title: 'Import Failed',
        message: `Failed to import app data: ${message}`,
        actionLabel: 'Retry',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmMemoryReset = async () => {
    setResettingMemory(true);
    try {
      // Keychain entries are intentionally left intact.
      // They live in the OS keychain (secured by login) and are keyed by plan ID.
      // If the user restores from a backup the file-to-plan-ID mapping comes back
      // and encrypted plans reconnect automatically without needing to re-enter keys.
      FileStorageService.clearAppMemory();
      setTheme('light');
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));

      setBackedUp(false);
      setShowResetConfirm(false);
      await window.electronAPI.quitApp();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      openErrorDialog({
        title: 'Reset Failed',
        message: `Failed to reset app memory: ${message}`,
        actionLabel: 'Retry',
      });
    } finally {
      setResettingMemory(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="Settings"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {/* Theme Settings */}
      <div className="settings-section">
        <h3>Appearance</h3>
        
        <div className="settings-group">
          <label>Theme</label>
          <div className="theme-options">
            <button
              className={`theme-option ${settings.themeMode === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeModeChange('light')}
              title="Light theme"
            >
              ☀️ Light
            </button>
            <button
              className={`theme-option ${settings.themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeModeChange('dark')}
              title="Dark theme"
            >
              🌙 Dark
            </button>
            <button
              className={`theme-option ${settings.themeMode === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeModeChange('system')}
              title="Follow system preference"
            >
              💻 System
            </button>
          </div>
        </div>

        <div className="settings-info">
          <span>Current theme: <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong></span>
        </div>
      </div>

      {/* Glossary Settings */}
      <div className="settings-section">
        <h3>Glossary</h3>

        <div className="settings-group">
          <label>Term Links</label>
          <PillToggle
            value={settings.glossaryTermsEnabled}
            onChange={handleGlossaryTermsChange}
            leftLabel="Off"
            rightLabel="On"
          />
        </div>

        <div className="settings-info">
          <span>
            Glossary term links are <strong>{settings.glossaryTermsEnabled ? 'enabled' : 'disabled'}</strong>.
            {settings.glossaryTermsEnabled
              ? ' Hover for definitions, click to open the full glossary.'
              : ' Terms display as plain text with no hover or click behaviour.'}
          </span>
        </div>
      </div>

      <div className="settings-section settings-danger-zone">
        <h3>App Memory Wipe</h3>
        <p className="settings-danger-copy">
          Remove this app&apos;s local preferences, recent files, and in-memory plan session. <b>Budget files themselves as well as keychain links are not deleted.</b>
        </p>
        <div className="settings-danger-actions">
          <Button
            variant="tertiary"
            onClick={handleImportAppData}
            isLoading={importing}
            loadingText="Importing…"
          >
            Import app data
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
          >
            Reset App Memory
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => {
          if (!resettingMemory) {
            setShowResetConfirm(false);
          }
        }}
        contentClassName="settings-reset-modal"
        header="Confirm App Memory Wipe"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowResetConfirm(false)}
              disabled={resettingMemory}
            >
              Cancel
            </Button>
            <Button
              variant="tertiary"
              onClick={handleExportBackup}
              isLoading={backingUp}
              loadingText="Backing up…"
              disabled={resettingMemory}
            >
              {backedUp ? '✓ Backed up' : 'Back Up First'}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmMemoryReset}
              isLoading={resettingMemory}
              loadingText="Resetting..."
            >
              Reset
            </Button>
          </>
        }
      >
        <p>
          This will wipe app memory on this device and then quit the app so the next launch starts fresh.
        </p>
        <p>
          Optionally back up your preferences first — they can be restored later via &quot;Import app data&quot; in Settings.
        </p>
      </Modal>

      <ErrorDialog
        isOpen={!!errorDialog}
        onClose={closeErrorDialog}
        title={errorDialog?.title || 'Error'}
        message={errorDialog?.message || ''}
        actionLabel={errorDialog?.actionLabel}
      />
    </Modal>
  );
};

export default SettingsModal;
