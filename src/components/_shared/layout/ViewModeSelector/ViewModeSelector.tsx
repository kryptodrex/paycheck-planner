import type { ViewMode } from '../../../../types/viewMode';
import { SELECTABLE_VIEW_MODES } from '../../../../utils/viewModePreferences';
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
  disabled?: boolean;
}

const ViewModeSelector = <T extends string = ViewMode,>({
  mode,
  onChange,
  options,
  disabled = false,
}: ViewModeSelectorProps<T>) => {
  const resolvedOptions = options ?? (SELECTABLE_VIEW_MODES.map((value) => ({
    value,
    label: getDisplayModeLabel(value),
  })) as ViewModeOption<T>[]);

  return (
    <div className="view-mode-selector">
      {resolvedOptions.map((option) => (
        <button
          key={option.value}
          className={`${mode === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeSelector;
