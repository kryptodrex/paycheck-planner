import React from 'react';
import { Button, Modal } from '../';
import './FileRelinkModal.css';

interface FileRelinkModalProps {
  isOpen: boolean;
  header: string;
  message: React.ReactNode;
  filePath: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  onClose: () => void;
  onLocate: () => void;
  extraAction?: {
    label: string;
    onClick: () => void;
    variant: 'danger' | 'secondary';
  };
}

const FileRelinkModal: React.FC<FileRelinkModalProps> = ({
  isOpen,
  header,
  message,
  filePath,
  errorMessage,
  isLoading = false,
  onClose,
  onLocate,
  extraAction,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={header}
      contentClassName="file-relink-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {extraAction && (
            <Button variant={extraAction.variant} onClick={extraAction.onClick} disabled={isLoading}>
              {extraAction.label}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onLocate}
            isLoading={isLoading}
            loadingText="Opening Picker..."
            disabled={isLoading}
          >
            Locate File
          </Button>
        </>
      }
    >
      <p className="file-relink-modal-message">{message}</p>
      <code className="file-relink-modal-path" title={filePath}>
        {filePath}
      </code>
      {errorMessage && <p className="file-relink-modal-error">{errorMessage}</p>}
    </Modal>
  );
};

export default FileRelinkModal;