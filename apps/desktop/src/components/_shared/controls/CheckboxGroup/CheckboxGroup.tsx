import React from 'react';
import './CheckboxGroup.css';

export interface CheckboxOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  selectedValues: string[];
  options: CheckboxOption[];
  onChange: (values: string[]) => void;
  layout?: 'row' | 'column';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  selectedValues,
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

  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter(v => v !== value));
    }
  };

  return (
    <div className={`shared-checkbox-group ${resolvedLayout} ${className || ''}`.trim()}>
      {options.map((option) => (
        <label
          key={option.value}
          className={`shared-checkbox-option ${option.disabled ? 'disabled' : ''}`.trim()}
        >
          <input
            type="checkbox"
            value={option.value}
            checked={selectedValues.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={option.disabled}
          />
          <span className="shared-checkbox-content">
            <span className="shared-checkbox-label">{option.label}</span>
            {option.description && (
              <span className="shared-checkbox-description">{option.description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
};

export default CheckboxGroup;
