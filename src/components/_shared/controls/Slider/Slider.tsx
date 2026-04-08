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
  /** Called once when the user begins a drag (pointerdown) or presses an arrow key (keydown). Use this to snapshot state for undo purposes. */
  onChangeStart?: () => void;
  /** Optional snap-target value within [min, max]. Renders a visual tick mark on the track so the user can see the target position. */
  snapPoint?: number;
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
  onChangeStart,
  snapPoint,
  label,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  const generatedId = useId();
  const sliderId = id || `slider-${generatedId.replace(/:/g, '')}`;

  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const snapPercentage =
    snapPoint !== undefined && max > min
      ? Math.min(100, Math.max(0, ((snapPoint - min) / (max - min)) * 100))
      : null;

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
        {snapPercentage !== null && (
          <div
            className="shared-slider-snap"
            style={{ left: `${snapPercentage}%` }}
            aria-hidden="true"
          />
        )}
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
          onPointerDown={onChangeStart}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              onChangeStart?.();
            }
          }}
        />
      </div>
    </div>
  );
};

export default Slider;
