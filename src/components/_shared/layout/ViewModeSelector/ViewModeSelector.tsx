import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import type { SelectableViewMode } from '../../../../types/viewMode';
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
  /** Plan-specific favorites; when provided, skips internal app-settings reads. */
  favorites?: SelectableViewMode[];
  payCadenceMode?: T;
  payCadenceLabel?: string;
  onOpenViewModeSettings?: () => void;
  disabled?: boolean;
}

const ViewModeSelector = <T extends string = ViewMode,>({
  mode,
  onChange,
  options,
  favorites: favoritesProp,
  payCadenceMode,
  payCadenceLabel = 'Your Pay Frequency',
  onOpenViewModeSettings,
  disabled = false,
}: ViewModeSelectorProps<T>) => {
  const favoriteModes = favoritesProp ?? sanitizeFavoriteViewModes(undefined);

  const resolvedOptions = useMemo(() => {
    if (options) {
      return options as ViewModeOption<T>[];
    }

    return buildViewModeSelectorOptions(favoriteModes, payCadenceMode as never) as ViewModeOption<T>[];
  }, [options, favoriteModes, payCadenceMode]);

  const optionsWithCadence = useMemo(() => {
    // Only auto-add cadence tab when the user has not explicitly configured
    // favorites (favouritesProp absent). When plan-specific favorites are
    // provided, the user's checkbox selection is the authoritative list.
    if (!payCadenceMode || options || favoritesProp !== undefined) {
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
  }, [payCadenceMode, options, favoritesProp, resolvedOptions]);

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
          <Settings className="ui-icon ui-icon-sm" aria-hidden="true" />
        </button>
      )}
      </div>
    </div>
  );
};

export default ViewModeSelector;
