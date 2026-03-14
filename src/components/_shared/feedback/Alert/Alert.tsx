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

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  children,
  className = '',
}) => {
  return (
    <div className={`alert alert-${type} ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Alert;
