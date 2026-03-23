import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { APPEARANCE_PRESET_MAP, APPEARANCE_PRESET_OPTIONS } from '../../../constants/appearancePresets';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { useAppDialogs } from '../../../hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppearancePreset, ColorVisionMode, StateCueMode, ThemeMode } from '../../../types/appearance';
import { Button, Dropdown, ErrorDialog, InfoBox, Modal, PillToggle } from '../../_shared';
import { FileStorageService } from '../../../services/fileStorage';
import {
  normalizeAppearancePreset,
  normalizeColorVisionMode,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeStateCueMode,
  normalizeThemeMode,
} from '../../../utils/appearanceSettings';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal will scroll to this section on open */
  initialSectionId?: string;
}

interface SettingsState {
  themeMode: ThemeMode;
  appearancePreset: AppearancePreset;
  highContrastMode: boolean;
  colorVisionMode: ColorVisionMode;
  stateCueMode: StateCueMode;
  fontScale: number;
  glossaryTermsEnabled: boolean;
}

const COLOR_VISION_OPTIONS: Array<{ value: ColorVisionMode; label: string; description: string }> = [
  { value: 'normal', label: 'Standard Color Vision', description: 'Default color behavior.' },
  { value: 'protanopia', label: 'Protanopia Support', description: 'Red-sensitive color adjustments.' },
  { value: 'deuteranopia', label: 'Deuteranopia Support', description: 'Green-sensitive color adjustments.' },
  { value: 'tritanopia', label: 'Tritanopia Support', description: 'Blue-sensitive color adjustments.' },
];

const STATE_CUE_OPTIONS: Array<{ value: StateCueMode; label: string; description: string }> = [
  {
    value: 'enhanced',
    label: 'Enhanced Cues (Recommended)',
    description: 'Shows extra state labels/icons/patterns for warning, error, destructive, and disabled states.',
  },
  {
    value: 'minimal',
    label: 'Minimal Cues',
    description: 'Hides additional state cues while preserving core behavior and theme colors.',
  },
];

interface SettingsSection {
  id: string;
  title: string;
  searchTerms: string;
}

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
    searchTerms: 'contrast high contrast color vision colorblind protanopia deuteranopia tritanopia font scale text size readability state cues labels icons pattern minimal enhanced',
  },
  {
    id: 'glossary',
    title: 'Glossary',
    searchTerms: 'glossary terms links definitions hover tooltip',
  },
  {
    id: 'app-data-reset',
    title: 'App Data and Reset',
    searchTerms: 'app data reset import backup',
  },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialSectionId }) => {
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
    colorVisionMode: normalizeColorVisionMode(appSettings.colorVisionMode),
    stateCueMode: normalizeStateCueMode(appSettings.stateCueMode),
    fontScale: normalizeFontScale(appSettings.fontScale),
    glossaryTermsEnabled: appSettings.glossaryTermsEnabled !== false,
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
      colorVisionMode: updated.colorVisionMode,
      stateCueMode: updated.stateCueMode,
      fontScale: updated.fontScale,
      glossaryTermsEnabled: updated.glossaryTermsEnabled,
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

  const handleColorVisionModeChange = (mode: ColorVisionMode) => {
    const updated = { ...settings, colorVisionMode: normalizeColorVisionMode(mode) };
    setSettings(updated);
    persistSettings(updated);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleStateCueModeChange = (mode: StateCueMode) => {
    const updated = { ...settings, stateCueMode: normalizeStateCueMode(mode) };
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

  // When opened with an initialSectionId (e.g. from plan-wide search), scroll there.
  // Section IDs must match SETTINGS_SECTIONS ids: 'appearance' | 'accessibility' | 'glossary' | 'app-data-reset'
  useEffect(() => {
    if (!isOpen || !initialSectionId) return;
    const id = window.setTimeout(() => {
      const sectionNode = sectionRefs.current[initialSectionId];
      if (sectionNode) {
        sectionNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSectionId(initialSectionId);
      } else if (import.meta.env.DEV) {
        console.warn(`[SettingsModal] initialSectionId "${initialSectionId}" did not match any section ref`);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [isOpen, initialSectionId]);

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
      header="App Settings"
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

              <InfoBox>
                Theme setting controls whether is in light or dark mode, or matching your system preference.
                {' '}
                Preset setting controls the overall color scheme of the app.
              </InfoBox>

              <div className="settings-group">
                <label>Theme</label>
                <div className="theme-options">
                  <button
                    className={`theme-option ${settings.themeMode === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeModeChange('light')}
                    title="Light theme"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <Sun className="ui-icon ui-icon-sm" aria-hidden="true" />
                      Light
                    </span>
                  </button>
                  <button
                    className={`theme-option ${settings.themeMode === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeModeChange('dark')}
                    title="Dark theme"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <Moon className="ui-icon ui-icon-sm" aria-hidden="true" />
                      Dark
                    </span>
                  </button>
                  <button
                    className={`theme-option ${settings.themeMode === 'system' ? 'active' : ''}`}
                    onClick={() => handleThemeModeChange('system')}
                    title="Follow system preference"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <Monitor className="ui-icon ui-icon-sm" aria-hidden="true" />
                      System
                    </span>
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

              <InfoBox>
                Accessibility options apply app-wide and persist across sessions on this device.
              </InfoBox>

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
                <label htmlFor="settings-font-scale">UI Font Scale</label>
                <Dropdown
                  id="settings-font-scale"
                  value={String(settings.fontScale)}
                  onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
                >
                  <option value="0.9">90% (Compact)</option>
                  <option value="1">100% (Default)</option>
                  <option value="1.1">110% (Comfortable)</option>
                  <option value="1.25">125% (Large)</option>
                </Dropdown>
                <p className="settings-search-hint">
                  Adjusts the base font size used in the app UI for improved readability. Does not affect overall zoom level of windows.
                </p>
              </div>

              <div className="settings-group">
                <label htmlFor="settings-color-vision">Color Vision Support</label>
                <Dropdown
                  id="settings-color-vision"
                  value={settings.colorVisionMode}
                  onChange={(e) => handleColorVisionModeChange(e.target.value as ColorVisionMode)}
                >
                  {COLOR_VISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Dropdown>
                <p className="settings-search-hint">
                  {COLOR_VISION_OPTIONS.find((option) => option.value === settings.colorVisionMode)?.description} Color Vision Support adjusts semantic state colors without changing your selected theme preset.
                </p>
              </div>

              <div className="settings-group">
                <label htmlFor="settings-state-cues">Enhanced State Cues</label>
                <PillToggle
                  value={settings.stateCueMode === 'enhanced'}
                  onChange={(value) => handleStateCueModeChange(value ? 'enhanced' : 'minimal')}
                  leftLabel="Off"
                  rightLabel="On"
                />
                <p className="settings-search-hint">
                  {STATE_CUE_OPTIONS.find((option) => option.value === settings.stateCueMode)?.description}
                </p>
              </div>
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

          {visibleSectionIds.has('app-data-reset') && (
            <div
              className="settings-section"
              ref={(node) => {
                sectionRefs.current['app-data-reset'] = node;
              }}
            >
              <h3 id="app-data-reset">App Data and Reset</h3>

              <div className="settings-danger-zone">
                <h4 className="settings-subsection-title">Reset App Settings</h4>
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
              {backedUp ? (
                <>
                  <Check className="ui-icon ui-icon-sm" aria-hidden="true" />
                  Backed up
                </>
              ) : (
                'Back Up First'
              )}
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
