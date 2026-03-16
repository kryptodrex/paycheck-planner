import type { ViewMode } from '../../../../types/viewMode';
import './ViewModeSelector.css';

export interface ViewModeOption<T extends string = string> {
  value: T;
  label: string;
}

interface ViewModeSelectorProps<T extends string = ViewMode> {
  mode: T;
  onChange: (mode: T) => void;
  options?: ViewModeOption<T>[];
  hintText?: string;
  reserveHintSpace?: boolean;
  hintVisibleModes?: T[];
}

const DEFAULT_OPTIONS: ViewModeOption<ViewMode>[] = [
  { value: 'paycheck', label: 'Per Paycheck' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const ViewModeSelector = <T extends string = ViewMode,>({
  mode,
  onChange,
  options,
  hintText,
  reserveHintSpace = false,
  hintVisibleModes,
}: ViewModeSelectorProps<T>) => {
  const resolvedOptions = (options ?? DEFAULT_OPTIONS) as ViewModeOption<T>[];
  const isHintVisibleForMode = !hintVisibleModes || hintVisibleModes.includes(mode);
  const effectiveHintText = isHintVisibleForMode ? hintText : undefined;
  const shouldRenderHintRow = reserveHintSpace || Boolean(effectiveHintText);

  return (
    <div className="view-mode-selector-wrap">
      <div className="view-mode-selector">
        {resolvedOptions.map((option) => (
          <button
            key={option.value}
            className={mode === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {shouldRenderHintRow && (
        <div className={`view-mode-selector-hint ${effectiveHintText ? '' : 'is-placeholder'}`}>
          {effectiveHintText || ' '}
        </div>
      )}
    </div>
  );
};

export default ViewModeSelector;
