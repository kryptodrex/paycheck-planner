import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Modal } from '../shared';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeOption;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsState>(() => {
    const stored = localStorage.getItem('paycheck-planner-settings');
    if (stored) {
      return JSON.parse(stored);
    }
    return { themeMode: 'light' as ThemeOption };
  });

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
    </Modal>
  );
};

export default Settings;
