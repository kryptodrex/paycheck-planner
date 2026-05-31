import React from 'react';
import { Button, Modal } from '../../';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
}) => {
  const contextMeta = confirmVariant === 'danger'
    ? { icon: '!', label: 'Destructive action' }
    : { icon: 'i', label: 'Confirmation required' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={title}
      contentClassName="confirm-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-dialog-context" aria-label={contextMeta.label}>
        <span className="confirm-dialog-context-icon" aria-hidden="true">{contextMeta.icon}</span>
        <span className="confirm-dialog-context-label">{contextMeta.label}</span>
      </p>
      <p className="confirm-dialog-message">{message}</p>
    </Modal>
  );
};

export default ConfirmDialog;