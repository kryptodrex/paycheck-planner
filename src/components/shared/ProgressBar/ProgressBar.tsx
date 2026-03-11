import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  /** Percentage complete (0-100) */
  percentage: number;
  /** Label/text to show above the bar */
  label?: React.ReactNode;
  /** Details text to show below the bar */
  details?: React.ReactNode;
  /** CSS class for custom styling */
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  details,
  className,
}) => {
  const displayPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`shared-progress-bar ${className || ''}`.trim()}>
      {label && <div className="shared-progress-label">{label}</div>}
      <div className="shared-progress-container">
        <div className="shared-progress-track">
          <div
            className="shared-progress-fill"
            style={{ width: `${displayPercentage}%` }}
          />
        </div>
      </div>
      {details && <div className="shared-progress-details">{details}</div>}
    </div>
  );
};

export default ProgressBar;
