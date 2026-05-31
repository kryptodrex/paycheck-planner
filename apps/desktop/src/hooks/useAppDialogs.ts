import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ErrorDialogOptions {
  title: string;
  message: ReactNode;
  actionLabel?: string;
  onClose?: () => void;
}

export function useAppDialogs() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const [errorDialog, setErrorDialog] = useState<ErrorDialogOptions | null>(null);

  const openConfirmDialog = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog({
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      confirmVariant: 'primary',
      ...options,
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    confirmDialog?.onCancel?.();
    setConfirmDialog(null);
  }, [confirmDialog]);

  const confirmCurrentDialog = useCallback(async () => {
    if (!confirmDialog) return;

    setConfirmDialog(null);
    await confirmDialog.onConfirm?.();
  }, [confirmDialog]);

  const openErrorDialog = useCallback((options: ErrorDialogOptions) => {
    setErrorDialog({
      actionLabel: 'OK',
      ...options,
    });
  }, []);

  const closeErrorDialog = useCallback(() => {
    errorDialog?.onClose?.();
    setErrorDialog(null);
  }, [errorDialog]);

  return {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    closeConfirmDialog,
    confirmCurrentDialog,
    openErrorDialog,
    closeErrorDialog,
  };
}