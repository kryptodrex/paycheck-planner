import React from 'react';
import { Button } from '../';
import './Modal.css';

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close (e.g., overlay click) */
  onClose: () => void;
  /** Optional CSS class names for the modal content */
  contentClassName?: string;
  /** The modal content */
  children: React.ReactNode;
  /** Optional footer content with action buttons */
  footer?: React.ReactNode;
  /** Optional header title or custom header content */
  header?: React.ReactNode;
  /** Show close button in header (default: true) */
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, contentClassName, children, footer, header, showCloseButton = true }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${contentClassName || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {header && (
          <div className="modal-header">
            {typeof header === 'string' ? <h2>{header}</h2> : header}
            {showCloseButton && (
              <Button 
                variant="icon" 
                onClick={onClose}
                title="Close modal"
                aria-label="Close modal"
              >
                ✕
              </Button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
