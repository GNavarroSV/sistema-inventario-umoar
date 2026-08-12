'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) setErrorMessage(null);
  }, [open]);

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo completar la acción.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.modalOverlay} />
        <Dialog.Content className={`${styles.modal} ${styles['modal--small']}`} aria-describedby={undefined}>
          <div className={styles.modalHeader}>
            <div>
              <Dialog.Title asChild>
                <h2>{title}</h2>
              </Dialog.Title>
              <p>{description}</p>
            </div>
            <Dialog.Close asChild>
              <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
            </Dialog.Close>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.confirmIcon} aria-hidden="true">!</div>
            {errorMessage ? (
              <div className={styles.confirmError} role="alert">
                {errorMessage}
              </div>
            ) : null}
            <div className={styles.actionsRow}>
              <button className="button button--danger" type="button" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Procesando...' : confirmLabel}
              </button>
              <button className="button button--ghost" type="button" onClick={onClose} disabled={loading}>
                {cancelLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
