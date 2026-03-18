import { useEffect, useMemo, useState } from 'react';
import { APP_CUSTOM_EVENTS } from '../../../../constants/events';
import { FileStorageService } from '../../../../services/fileStorage';
import type { ViewMode } from '../../../../types/viewMode';
import { buildViewModeSelectorOptions, sanitizeFavoriteViewModes } from '../../../../utils/viewModePreferences';
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
}

const ViewModeSelector = <T extends string = ViewMode,>({
  mode,
  onChange,
  options,
  payCadenceMode,
  payCadenceLabel = 'Pay cadence',
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

    return buildViewModeSelectorOptions(favoriteModes) as ViewModeOption<T>[];
  }, [options, favoriteModes]);

  return (
    <div className="view-mode-selector-wrap">
      <div className="view-mode-selector">
        {resolvedOptions.map((option) => (
          <button
            key={option.value}
            className={mode === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            {payCadenceMode === option.value && (
              <span className="view-mode-selector-cadence">{payCadenceLabel}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewModeSelector;
