import React from 'react';
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
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, contentClassName, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${contentClassName || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
