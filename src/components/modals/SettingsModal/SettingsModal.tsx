import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPEARANCE_PRESET_MAP, APPEARANCE_PRESET_OPTIONS } from '../../../constants/appearancePresets';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { useAppDialogs } from '../../../hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppearancePreset, ThemeMode } from '../../../types/appearance';
import type { SelectableViewMode } from '../../../types/viewMode';
import { Button, CheckboxGroup, Dropdown, ErrorDialog, InfoBox, Modal, PillToggle } from '../../_shared';
import { FileStorageService } from '../../../services/fileStorage';
import { SELECTABLE_VIEW_MODES, sanitizeFavoriteViewModes } from '../../../utils/viewModePreferences';
import {
  normalizeAppearancePreset,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeThemeMode,
} from '../../../utils/appearanceSettings';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsState {
  themeMode: ThemeMode;
  appearancePreset: AppearancePreset;
  highContrastMode: boolean;
  fontScale: number;
  glossaryTermsEnabled: boolean;
  viewModeFavorites: SelectableViewMode[];
}

interface SettingsSection {
  id: string;
  title: string;
  searchTerms: string;
}

const formatViewModeLabel = (mode: SelectableViewMode): string => {
  if (mode === 'bi-weekly') {
    return 'Bi-weekly';
  }

  if (mode === 'semi-monthly') {
    return 'Semi-monthly';
  }

  return mode.charAt(0).toUpperCase() + mode.slice(1);
};

const VIEW_MODE_OPTIONS = SELECTABLE_VIEW_MODES.map((mode) => ({
  value: mode,
  label: formatViewModeLabel(mode),
}));

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    searchTerms: [
      'theme light dark system preset style color palette',
      APPEARANCE_PRESET_OPTIONS.map((preset) => `${preset.value} ${preset.label} ${preset.description}`).join(' '),
    ].join(' '),
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    searchTerms: 'contrast high contrast font scale text size readability',
  },
  {
    id: 'glossary',
    title: 'Glossary',
    searchTerms: 'glossary terms links definitions hover tooltip',
  },
  {
    id: 'view-mode-favorites',
    title: 'View Mode Favorites',
    searchTerms: [
      'view mode cadence favorites',
      VIEW_MODE_OPTIONS.map((option) => `${option.value} ${option.label}`).join(' '),
    ].join(' '),
  },
  {
    id: 'reset-app-settings',
    title: 'Reset App Settings',
    searchTerms: 'reset import backup danger zone memory settings app data',
  },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingMemory, setResettingMemory] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>(SETTINGS_SECTIONS[0].id);
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getNormalizedSettingsState = (appSettings: ReturnType<typeof FileStorageService.getAppSettings>): SettingsState => ({
    themeMode: normalizeThemeMode(appSettings.themeMode) || 'light',
    appearancePreset: normalizeAppearancePreset(appSettings.appearancePreset),
    highContrastMode: normalizeHighContrastMode(appSettings.highContrastMode),
    fontScale: normalizeFontScale(appSettings.fontScale),
    glossaryTermsEnabled: appSettings.glossaryTermsEnabled !== false,
    viewModeFavorites: sanitizeFavoriteViewModes(appSettings.viewModeFavorites),
  });

  const [settings, setSettings] = useState<SettingsState>(() => {
    return getNormalizedSettingsState(FileStorageService.getAppSettings());
  });

  // Always merges with full existing settings so encryptionEnabled is never lost
  const persistSettings = (updated: SettingsState) => {
    const existing = FileStorageService.getAppSettings();
    FileStorageService.saveAppSettings({
      ...existing,
      themeMode: updated.themeMode,
      appearanceMode: 'preset',
      appearancePreset: updated.appearancePreset,
      highContrastMode: updated.highContrastMode,
      fontScale: updated.fontScale,
      glossaryTermsEnabled: updated.glossaryTermsEnabled,
      viewModeFavorites: sanitizeFavoriteViewModes(updated.viewModeFavorites),
    });
  };

  // Custom mode groundwork remains in the data model, but UI currently enforces curated presets only.
  useEffect(() => {
    const existing = FileStorageService.getAppSettings();
    if (existing.appearanceMode !== 'custom') {
      return;
    }

    persistSettings(settings);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThemeModeChange = (mode: ThemeMode) => {
    const updated = { ...settings, themeMode: mode };
    setSettings(updated);
    persistSettings(updated);

    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
    } else if (mode === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }

    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleAppearancePresetChange = (preset: AppearancePreset) => {
    const updated = { ...settings, appearancePreset: preset };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleHighContrastModeChange = (enabled: boolean) => {
    const updated = { ...settings, highContrastMode: enabled };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleFontScaleChange = (scale: number) => {
    const normalized = normalizeFontScale(scale);
    const updated = { ...settings, fontScale: normalized };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleGlossaryTermsChange = (enabled: boolean) => {
    const updated = { ...settings, glossaryTermsEnabled: enabled };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new CustomEvent(APP_CUSTOM_EVENTS.glossaryTermsChanged, { detail: { enabled } }));
  };

  const handleViewModeFavoritesChange = (values: string[]) => {
    const updated = {
      ...settings,
      viewModeFavorites: sanitizeFavoriteViewModes(values) as SelectableViewMode[],
    };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.viewModeFavoritesChanged));
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
      const normalized = getNormalizedSettingsState(restored);
      const newThemeMode = normalized.themeMode;
      const newGlossary = normalized.glossaryTermsEnabled;
      setSettings(normalized);

      if (newThemeMode === 'light' || newThemeMode === 'dark') {
        setTheme(newThemeMode);
      } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemDark ? 'dark' : 'light');
      }
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
      window.dispatchEvent(new CustomEvent(APP_CUSTOM_EVENTS.glossaryTermsChanged, { detail: { enabled: newGlossary } }));
      window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.viewModeFavoritesChanged));
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

  const visibleSections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return SETTINGS_SECTIONS;
    }

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return SETTINGS_SECTIONS.filter((section) => {
      const corpus = `${section.title.toLowerCase()} ${section.searchTerms}`;
      return queryTokens.every((token) => corpus.includes(token));
    });
  }, [searchQuery]);

  const searchTokens = useMemo(() => searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean), [searchQuery]);

  const matchingAppearancePresetValues = useMemo(() => {
    if (searchTokens.length === 0) {
      return null;
    }

    const matches = APPEARANCE_PRESET_OPTIONS.filter((preset) => {
      const corpus = `${preset.value} ${preset.label} ${preset.description}`.toLowerCase();
      return searchTokens.every((token) => corpus.includes(token));
    }).map((preset) => preset.value);

    return new Set(matches);
  }, [searchTokens]);

  const visibleAppearancePresets = useMemo(() => {
    if (!matchingAppearancePresetValues || matchingAppearancePresetValues.size === 0) {
      return APPEARANCE_PRESET_OPTIONS;
    }

    return APPEARANCE_PRESET_OPTIONS.filter((preset) => matchingAppearancePresetValues.has(preset.value));
  }, [matchingAppearancePresetValues]);

  const matchingViewModeValues = useMemo(() => {
    if (searchTokens.length === 0) {
      return null;
    }

    const matches = VIEW_MODE_OPTIONS.filter((option) => {
      const corpus = `${option.value} ${option.label}`.toLowerCase();
      return searchTokens.every((token) => corpus.includes(token));
    }).map((option) => option.value);

    return new Set(matches);
  }, [searchTokens]);

  const visibleViewModeOptions = useMemo(() => {
    if (!matchingViewModeValues || matchingViewModeValues.size === 0) {
      return VIEW_MODE_OPTIONS;
    }

    return VIEW_MODE_OPTIONS.filter((option) => matchingViewModeValues.has(option.value));
  }, [matchingViewModeValues]);

  const visibleSectionIds = useMemo(() => new Set(visibleSections.map((section) => section.id)), [visibleSections]);

  useEffect(() => {
    if (visibleSections.length === 0) {
      return;
    }

    if (!visibleSectionIds.has(activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, visibleSectionIds, visibleSections]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setSearchQuery('');
    setActiveSectionId(SETTINGS_SECTIONS[0].id);
  }, [isOpen]);

  const scrollToSection = (sectionId: string) => {
    const sectionNode = sectionRefs.current[sectionId];
    if (!sectionNode) {
      return;
    }

    sectionNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSectionId(sectionId);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="settings-modal-content"
      header="Settings"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="settings-search-wrap">
        <label htmlFor="settings-search" className="settings-search-label">Search Settings</label>
        <input
          id="settings-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="settings-search-input"
          placeholder="Search by section or setting"
          autoComplete="off"
        />
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label="Settings sections">
          {visibleSections.length === 0 ? (
            <p className="settings-sidebar-empty">No sections match your search.</p>
          ) : (
            visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`settings-sidebar-item ${activeSectionId === section.id ? 'active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))
          )}
        </aside>

        <div className="settings-content">
          {visibleSectionIds.has('appearance') && (
            <div
              className="settings-section"
              ref={(node) => {
                sectionRefs.current.appearance = node;
              }}
            >
              <h3 id="appearance">Appearance</h3>
        
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

        <div className="settings-group">
          <label>Preset</label>
          <div className="settings-preset-grid" role="radiogroup" aria-label="Theme preset">
            {visibleAppearancePresets.map((preset) => {
              const active = settings.appearancePreset === preset.value;
              const matchedBySearch = !!matchingAppearancePresetValues?.has(preset.value);
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`settings-preset-card ${active ? 'active' : ''} ${matchedBySearch ? 'search-match' : ''}`}
                  onClick={() => handleAppearancePresetChange(preset.value)}
                >
                  <span className="settings-preset-preview" aria-hidden="true">
                    <span
                      className="settings-preset-preview-header"
                      style={{
                        background: `linear-gradient(135deg, ${preset.preview.accent} 0%, ${preset.preview.accentAlt} 100%)`,
                      }}
                    />
                    <span
                      className="settings-preset-preview-surface"
                      style={{ background: preset.preview.surface }}
                    >
                      <span
                        className="settings-preset-preview-pill"
                        style={{ background: preset.preview.accent }}
                      />
                      <span
                        className="settings-preset-preview-line"
                        style={{ background: preset.preview.text }}
                      />
                      <span
                        className="settings-preset-preview-line settings-preset-preview-line-soft"
                        style={{ background: preset.preview.accentAlt }}
                      />
                    </span>
                  </span>
                  <span className="settings-preset-copy">
                    <strong>{preset.label}</strong>
                    <span>{preset.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {matchingAppearancePresetValues && matchingAppearancePresetValues.size > 0 && (
            <p className="settings-search-hint" role="status">
              Showing matching presets for "{searchQuery.trim()}".
            </p>
          )}
        </div>

              <div className="settings-info">
                <span>
                  Current theme: <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong>
                  {' • '}
                  Preset: <strong>{APPEARANCE_PRESET_MAP[settings.appearancePreset].label}</strong>
                </span>
              </div>
            </div>
          )}

          {visibleSectionIds.has('accessibility') && (
            <div
              className="settings-section"
              ref={(node) => {
                sectionRefs.current.accessibility = node;
              }}
            >
              <h3 id="accessibility">Accessibility</h3>

        <div className="settings-group">
          <label>High Contrast Mode</label>
          <PillToggle
            value={settings.highContrastMode}
            onChange={handleHighContrastModeChange}
            leftLabel="Off"
            rightLabel="On"
          />
        </div>

        <div className="settings-group">
          <label>UI Font Scale</label>
          <Dropdown
            value={String(settings.fontScale)}
            onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
          >
            <option value="0.9">90% (Compact)</option>
            <option value="1">100% (Default)</option>
            <option value="1.1">110% (Comfortable)</option>
            <option value="1.25">125% (Large)</option>
          </Dropdown>
        </div>

              <InfoBox>
                Accessibility options apply app-wide and persist across sessions on this device.
              </InfoBox>
            </div>
          )}

          {visibleSectionIds.has('glossary') && (
            <div
              className="settings-section"
              ref={(node) => {
                sectionRefs.current.glossary = node;
              }}
            >
              <h3 id="glossary">Glossary</h3>

        <div className="settings-group">
          <label>Term Links</label>
          <PillToggle
            value={settings.glossaryTermsEnabled}
            onChange={handleGlossaryTermsChange}
            leftLabel="Off"
            rightLabel="On"
          />
        </div>

              <InfoBox>
                Glossary term links are <strong>{settings.glossaryTermsEnabled ? 'enabled' : 'disabled'}</strong>.
                {settings.glossaryTermsEnabled
                  ? ' Hover for definitions, click to open the full glossary.'
                  : ' Terms display as plain text with no hover or click behaviour.'}
              </InfoBox>
            </div>
          )}

          {visibleSectionIds.has('view-mode-favorites') && (
            <div
              className="settings-section"
              ref={(node) => {
                sectionRefs.current['view-mode-favorites'] = node;
              }}
            >
              <h3 id="view-mode-favorites">View Mode Favorites</h3>

        <div className="settings-group">
          <label>Always Show These View Modes</label>
          <CheckboxGroup
            selectedValues={settings.viewModeFavorites}
            onChange={handleViewModeFavoritesChange}
            className="settings-view-mode-grid"
            options={visibleViewModeOptions.map((option) => ({
              value: option.value,
              label: option.label,
              disabled:
                settings.viewModeFavorites.length === 1
                && settings.viewModeFavorites.includes(option.value),
            }))}
          />
          {matchingViewModeValues && matchingViewModeValues.size > 0 && (
            <p className="settings-search-hint" role="status">
              Showing matching view modes for "{searchQuery.trim()}".
            </p>
          )}
        </div>

              <InfoBox>
                Favorites apply app-wide and carry across all plans on this device. At least one view mode must stay enabled.
              </InfoBox>
            </div>
          )}

          {visibleSectionIds.has('reset-app-settings') && (
            <div
              className="settings-section settings-danger-zone"
              ref={(node) => {
                sectionRefs.current['reset-app-settings'] = node;
              }}
            >
              <h3 id="reset-app-settings">Reset App Settings</h3>
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
                  Import App Settings
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Reset App Settings
                </Button>
              </div>
            </div>
          )}

          {visibleSections.length === 0 && (
            <div className="settings-empty-state" role="status">
              No matching settings found. Try broader keywords.
            </div>
          )}
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
