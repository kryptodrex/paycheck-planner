import React from 'react';
import './PillToggle.css';

interface PillToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
  className?: string;
}

const PillToggle: React.FC<PillToggleProps> = ({
  value,
  onChange,
  leftLabel = 'Off',
  rightLabel = 'On',
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`pill-toggle ${disabled ? 'disabled' : ''} ${className}`.trim()}>
      <div className={`pill-toggle-slider ${value ? 'active' : ''}`} />
      <button
        type="button"
        className={`pill-toggle-option ${!value ? 'active' : ''}`}
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        className={`pill-toggle-option ${value ? 'active' : ''}`}
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
      >
        {rightLabel}
      </button>
    </div>
  );
};

export default PillToggle;
