import React from 'react';
import './TransientStatusIndicator.css';

interface TransientStatusIndicatorProps {
  message: string | null;
  variant?: 'default' | 'warning';
  topRem?: number;
  rightRem?: number;
  zoomFactor?: number;
}

const TransientStatusIndicator: React.FC<TransientStatusIndicatorProps> = ({
  message,
  variant = 'default',
  topRem = 2.35,
  rightRem = 1,
  zoomFactor = 1,
}) => {
  if (!message) return null;

  const safeZoomFactor = zoomFactor > 0 ? zoomFactor : 1;

  return (
    <div
      className={`transient-status-indicator transient-status-indicator--${variant}`}
      role="status"
      aria-live="polite"
      style={{
        top: `${topRem / safeZoomFactor}rem`,
        right: `${rightRem / safeZoomFactor}rem`,
        transform: `scale(${1 / safeZoomFactor})`,
      }}
    >
      {message}
    </div>
  );
};

export default TransientStatusIndicator;
