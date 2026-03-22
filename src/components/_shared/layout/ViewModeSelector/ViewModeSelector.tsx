import { useEffect, useMemo, useState } from 'react';
import { APP_CUSTOM_EVENTS } from '../../../../constants/events';
import { FileStorageService } from '../../../../services/fileStorage';
import type { ViewMode } from '../../../../types/viewMode';
import { buildViewModeSelectorOptions, sanitizeFavoriteViewModes } from '../../../../utils/viewModePreferences';
import { getDisplayModeLabel } from '../../../../utils/payPeriod';
import './ViewModeSelector.css';

export interface ViewModeOption<T extends string = string> {
  value: T;
  label: string;
}

interface ViewModeSelectorProps<T extends string = ViewMode> {
  mode: T;
  onChange: (mode: T) => void;
  options?: ViewModeOption<T>[];
  payCadenceMode?: T;
  payCadenceLabel?: string;
  onOpenViewModeSettings?: () => void;
  disabled?: boolean;
}

const ViewModeSelector = <T extends string = ViewMode,>({
  mode,
  onChange,
  options,
  payCadenceMode,
  payCadenceLabel = 'Your Pay Frequency',
  onOpenViewModeSettings,
  disabled = false,
}: ViewModeSelectorProps<T>) => {
  const [favoriteModes, setFavoriteModes] = useState(() =>
    sanitizeFavoriteViewModes(FileStorageService.getAppSettings().viewModeFavorites),
  );

  useEffect(() => {
    if (options) return;

    const handleFavoritesChanged = () => {
      setFavoriteModes(
        sanitizeFavoriteViewModes(FileStorageService.getAppSettings().viewModeFavorites),
      );
    };

    window.addEventListener(APP_CUSTOM_EVENTS.viewModeFavoritesChanged, handleFavoritesChanged);
    return () => {
      window.removeEventListener(APP_CUSTOM_EVENTS.viewModeFavoritesChanged, handleFavoritesChanged);
    };
  }, [options]);

  const resolvedOptions = useMemo(() => {
    if (options) {
      return options as ViewModeOption<T>[];
    }

    return buildViewModeSelectorOptions(favoriteModes, payCadenceMode as never) as ViewModeOption<T>[];
  }, [options, favoriteModes, payCadenceMode]);

  const optionsWithCadence = useMemo(() => {
    if (!payCadenceMode || options) {
      return resolvedOptions;
    }

    if (resolvedOptions.some((option) => option.value === payCadenceMode)) {
      return resolvedOptions;
    }

    return [
      {
        value: payCadenceMode,
        label: getDisplayModeLabel(payCadenceMode as ViewMode),
      } as ViewModeOption<T>,
      ...resolvedOptions,
    ];
  }, [payCadenceMode, options, resolvedOptions]);

  return (
    <div className="view-mode-selector-wrap">
      <div className="view-mode-selector">
        {optionsWithCadence.map((option) => (
          <button
            key={option.value}
            className={mode === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            <span>{option.label}</span>
            {payCadenceMode === option.value && (
              <span className="view-mode-selector-cadence">{payCadenceLabel}</span>
            )}
          </button>
        ))}
        {!options && onOpenViewModeSettings && (
        <button
          className="view-mode-settings-button"
          onClick={onOpenViewModeSettings}
          aria-label="Open view mode settings"
          title="Open view mode settings"
        >
          ⚙
        </button>
      )}
      </div>
    </div>
  );
};

export default ViewModeSelector;
