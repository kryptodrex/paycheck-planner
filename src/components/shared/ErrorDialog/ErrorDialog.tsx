import React from 'react';
import { Button, Modal } from '../';
import './ErrorDialog.css';

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  actionLabel?: string;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actionLabel = 'OK',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={title}
      contentClassName="error-dialog"
      footer={
        <Button variant="primary" onClick={onClose}>
          {actionLabel}
        </Button>
      }
    >
      <p className="error-dialog-message">{message}</p>
    </Modal>
  );
};

export default ErrorDialog;