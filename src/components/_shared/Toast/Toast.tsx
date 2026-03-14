import React, { useEffect } from 'react';
import './Toast.css';

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
      {message}
    </div>
  );
};

export default Toast;
