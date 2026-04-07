import React, { useId } from 'react';
import './Slider.css';

export type SliderSize = 'sm' | 'md' | 'lg';

interface SliderProps {
  id?: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  size?: SliderSize;
  className?: string;
  'aria-label'?: string;
}

const Slider: React.FC<SliderProps> = ({
  id,
  value,
  min = 0,
  max,
  step = 0.01,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  const generatedId = useId();
  const sliderId = id || `slider-${generatedId.replace(/:/g, '')}`;

  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={`shared-slider size-${size} ${disabled ? 'disabled' : ''} ${className || ''}`.trim()}>
      {label && (
        <label htmlFor={sliderId} className="shared-slider-label">
          {label}
        </label>
      )}
      <div className="shared-slider-track-wrapper">
        <div
          className="shared-slider-fill"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
        <input
          id={sliderId}
          type="range"
          className="shared-slider-input"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};

export default Slider;
