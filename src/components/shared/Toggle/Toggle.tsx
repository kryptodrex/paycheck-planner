import React, { useId } from 'react';
import './Toggle.css';

interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ id, checked, onChange, label, disabled = false }) => {
  const generatedId = useId();
  const toggleId = id || `toggle-${generatedId.replace(/:/g, '')}`;

  return (
    <div className="toggle-wrapper">
      <label htmlFor={toggleId} className={`toggle-label ${disabled ? 'disabled' : ''}`}>
        <input
          id={toggleId}
          type="checkbox"
          className="toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-switch">
          <span className="toggle-slider"></span>
        </span>
        {label && <span className="toggle-text">{label}</span>}
      </label>
    </div>
  );
};

export default Toggle;
