import React from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import './Alert.css';

interface AlertProps {
  /** Alert type/severity */
  type?: 'error' | 'warning' | 'success' | 'info';
  /** The alert message/content */
  children: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
}

const ALERT_META: Record<NonNullable<AlertProps['type']>, { icon: React.ReactNode; label: string }> = {
  error:   { icon: <X className="ui-icon" />,             label: 'Error' },
  warning: { icon: <AlertTriangle className="ui-icon" />, label: 'Warning' },
  success: { icon: <Check className="ui-icon" />,         label: 'Success' },
  info:    { icon: <Info className="ui-icon" />,          label: 'Info' },
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
