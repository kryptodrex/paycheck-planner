import React from 'react';
import './ViewModeSelector.css';

type ViewMode = 'paycheck' | 'monthly' | 'yearly';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hintText?: string;
  reserveHintSpace?: boolean;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ mode, onChange, hintText, reserveHintSpace = false }) => {
  const shouldRenderHintRow = reserveHintSpace || Boolean(hintText);

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
        <div className={`view-mode-selector-hint ${hintText ? '' : 'is-placeholder'}`}>
          {hintText || ' '}
        </div>
      )}
    </div>
  );
};

export default ViewModeSelector;
