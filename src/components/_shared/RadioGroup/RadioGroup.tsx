import React from 'react';
import './RadioGroup.css';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  layout?: 'row' | 'column';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  options,
  onChange,
  layout,
  orientation,
  className,
}) => {
  const resolvedLayout: 'row' | 'column' = layout
    ? layout
    : orientation === 'horizontal'
      ? 'row'
      : 'column';

  return (
    <div className={`shared-radio-group ${resolvedLayout} ${className || ''}`.trim()}>
      {options.map((option) => (
        <label
          key={option.value}
          className={`shared-radio-option ${option.disabled ? 'disabled' : ''}`.trim()}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={option.disabled}
          />
          <span className="shared-radio-content">
            <span className="shared-radio-label">{option.label}</span>
            {option.description && (
              <span className="shared-radio-description">{option.description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
};

export default RadioGroup;
