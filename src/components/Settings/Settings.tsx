import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBudget } from '../../contexts/BudgetContext';
import { KeychainService } from '../../services/keychainService';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEncryptionSetup?: () => void;
  onOpenPaySettings?: () => void;
  hasActivePlan?: boolean;
}

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeOption;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onOpenEncryptionSetup, onOpenPaySettings, hasActivePlan }) => {
  const { theme, setTheme } = useTheme();
  const { budgetData, updateBudgetSettings } = useBudget();
  const [togglegingEncryption, setTogglingEncryption] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(() => {
    const stored = localStorage.getItem('paycheck-planner-settings');
    if (stored) {
      return JSON.parse(stored);
    }
    return { themeMode: 'light' as ThemeOption };
  });

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleThemeModeChange = (mode: ThemeOption) => {
    setSettings((prev) => {
      const updated = { ...prev, themeMode: mode };
      localStorage.setItem('paycheck-planner-settings', JSON.stringify(updated));
      
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

  const handleToggleEncryption = async () => {
    if (!budgetData) return;

    try {
      const newEncryptionState = !budgetData.settings.encryptionEnabled;

      // If disabling encryption, delete the key and update settings
      if (!newEncryptionState) {
        setTogglingEncryption(true);
        try {
          await KeychainService.deleteKey(budgetData.id);
        } catch {
          // If deletion fails, it's not critical - the key will just stay in keychain
        }
        updateBudgetSettings({
          ...budgetData.settings,
          encryptionEnabled: false,
        });
        setTogglingEncryption(false);
      } else {
        // If enabling encryption, check if we have a key
        const existingKey = await KeychainService.getKey(budgetData.id);
        if (existingKey) {
          // We have a key already, just enable it
          updateBudgetSettings({
            ...budgetData.settings,
            encryptionEnabled: true,
          });
        } else {
          // No key exists, need to set up encryption
          // Close Settings and let parent handle the encryption setup flow
          onClose();
          onOpenEncryptionSetup?.();
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to toggle encryption: ${errorMsg}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-content">
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
              <p>Current theme: <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong></p>
            </div>
          </div>

          {/* Plan Settings Section (only show when a plan is active) */}
          {hasActivePlan && budgetData && (
            <div className="settings-section">
              <h3>Plan Settings</h3>
              
              <div className="settings-group">
                <label className="setting-label">Encryption</label>
                <div className="settings-info">
                  <p>Status: <strong>{budgetData.settings.encryptionEnabled ? '🔒 Encrypted' : '📄 Unencrypted'}</strong></p>
                </div>
                <div className="settings-action-buttons">
                  <button
                    className={`settings-action-btn ${budgetData.settings.encryptionEnabled ? 'active' : ''}`}
                    onClick={handleToggleEncryption}
                    disabled={togglegingEncryption}
                    title={budgetData.settings.encryptionEnabled ? 'Disable encryption for this plan' : 'Enable encryption for this plan'}
                  >
                    <span className="action-icon">{budgetData.settings.encryptionEnabled ? '🔒' : '🔓'}</span>
                    <div className="action-content">
                      <div className="action-title">{budgetData.settings.encryptionEnabled ? 'Disable Encryption' : 'Enable Encryption'}</div>
                      <div className="action-description">{budgetData.settings.encryptionEnabled ? 'Turn off encryption for sharing' : 'Protect this plan with encryption'}</div>
                    </div>
                  </button>
                  
                  {budgetData.settings.encryptionEnabled && (
                    <button
                      className="settings-action-btn"
                      onClick={() => {
                        onOpenEncryptionSetup?.();
                        onClose();
                      }}
                      title="Change encryption password"
                    >
                      <span className="action-icon">🔑</span>
                      <div className="action-content">
                        <div className="action-title">Manage Encryption Key</div>
                        <div className="action-description">View or change your encryption password</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-group">
                <button
                  className="settings-action-btn"
                  onClick={() => {
                    onOpenPaySettings?.();
                    onClose();
                  }}
                >
                  <span className="action-icon">💵</span>
                  <div className="action-content">
                    <div className="action-title">Pay Options</div>
                    <div className="action-description">Edit pay type, frequency, and tax settings</div>
                  </div>
                </button>
              </div>

              <div className="settings-group">
                <button
                  className="settings-action-btn"
                  disabled
                  title="Coming soon"
                >
                  <span className="action-icon">🏦</span>
                  <div className="action-content">
                    <div className="action-title">Accounts</div>
                    <div className="action-description">Manage savings and checking accounts</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
