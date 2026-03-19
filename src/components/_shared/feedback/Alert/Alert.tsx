import React from 'react';
import './Alert.css';

interface AlertProps {
  /** Alert type/severity */
  type?: 'error' | 'warning' | 'success' | 'info';
  /** The alert message/content */
  children: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
}

const ALERT_META: Record<NonNullable<AlertProps['type']>, { icon: string; label: string }> = {
  error: { icon: '!', label: 'Error' },
  warning: { icon: '!', label: 'Warning' },
  success: { icon: '✓', label: 'Success' },
  info: { icon: 'i', label: 'Info' },
};

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  children,
  className = '',
}) => {
  const meta = ALERT_META[type];

  return (
    <div className={`alert alert-${type} ${className}`.trim()}>
      <div className="alert-heading">
        <span className="alert-icon" aria-hidden="true">{meta.icon}</span>
        <span className="alert-label">{meta.label}</span>
      </div>
      <div className="alert-content">{children}</div>
    </div>
  );
};

export default Alert;
