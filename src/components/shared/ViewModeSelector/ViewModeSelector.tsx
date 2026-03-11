import React from 'react';
import './ViewModeSelector.css';

type ViewMode = 'paycheck' | 'monthly' | 'yearly';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ mode, onChange }) => {
  return (
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
  );
};

export default ViewModeSelector;
