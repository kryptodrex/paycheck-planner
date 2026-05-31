import React, { useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import './Toast.css';

const TOAST_ICONS: Record<'success' | 'warning' | 'error', React.ReactNode> = {
  success: <Check className="ui-icon" aria-hidden="true" />,
  warning: <AlertTriangle className="ui-icon" aria-hidden="true" />,
  error:   <X className="ui-icon" aria-hidden="true" />,
};

interface ToastProps {
  /** The message to display in the toast */
  message: string | null;
  /** Visual variant for toast background and border */
  type?: 'success' | 'warning' | 'error';
  /** Duration in milliseconds before auto-dismissing (default: 2500) */
  duration?: number;
  /** Callback when the toast should dismiss */
  onDismiss?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 2500, onDismiss }) => {
  useEffect(() => {
    if (!message) return;
    
    const timer = window.setTimeout(() => {
      onDismiss?.();
    }, duration);
    
    return () => window.clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span className="toast-icon-wrap" aria-hidden="true">{TOAST_ICONS[type]}</span>
      {message}
    </div>
  );
};

export default Toast;
