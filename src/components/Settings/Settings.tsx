import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Modal, PillToggle } from '../shared';
import { FileStorageService } from '../../services/fileStorage';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeOption;
  glossaryTermsEnabled: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
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
      window.dispatchEvent(new Event('theme-mode-changed'));

      return updated;
    });
  };

  const handleGlossaryTermsChange = (enabled: boolean) => {
    setSettings((prev) => {
      const updated = { ...prev, glossaryTermsEnabled: enabled };
      persistSettings(updated);
      window.dispatchEvent(new CustomEvent('glossary-terms-changed', { detail: { enabled } }));
      return updated;
    });
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
    </Modal>
  );
};

export default Settings;
