import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
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

  // Listen for system theme changes when in System mode
  useEffect(() => {
    if (settings.themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.themeMode, setTheme]);

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
      
      return updated;
    });
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
          {hasActivePlan && (
            <div className="settings-section">
              <h3>Plan Settings</h3>
              
              <div className="settings-group">
                <button
                  className="settings-action-btn"
                  onClick={() => {
                    onOpenEncryptionSetup?.();
                    onClose();
                  }}
                >
                  <span className="action-icon">🔒</span>
                  <div className="action-content">
                    <div className="action-title">Encryption Settings</div>
                    <div className="action-description">Change encryption password or disable encryption</div>
                  </div>
                </button>
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
