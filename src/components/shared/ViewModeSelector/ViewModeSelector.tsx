import React from 'react';
import type { ViewMode } from '../../../types/viewMode';
import './ViewModeSelector.css';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hintText?: string;
  reserveHintSpace?: boolean;
  hintVisibleModes?: ViewMode[];
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  mode,
  onChange,
  hintText,
  reserveHintSpace = false,
  hintVisibleModes,
}) => {
  const isHintVisibleForMode = !hintVisibleModes || hintVisibleModes.includes(mode);
  const effectiveHintText = isHintVisibleForMode ? hintText : undefined;
  const shouldRenderHintRow = reserveHintSpace || Boolean(effectiveHintText);

  return (
    <div className="view-mode-selector-wrap">
      <div className="view-mode-selector">
        <button
          className={mode === 'paycheck' ? 'active' : ''}
          onClick={() => onChange('paycheck')}
        >
          Per Paycheck
        </button>
        <button
          className={mode === 'monthly' ? 'active' : ''}
          onClick={() => onChange('monthly')}
        >
          Monthly
        </button>
        <button
          className={mode === 'yearly' ? 'active' : ''}
          onClick={() => onChange('yearly')}
        >
          Yearly
        </button>
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
