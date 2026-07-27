'use client';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  const handleConfirm = async () => {
    if (window.confirm(`${title}\n\n${description}`)) {
      await onConfirm();
      onClose();
    }
  };

  return (
    <button className="button button--danger" type="button" onClick={handleConfirm} disabled={loading}>
      {loading ? 'Procesando...' : confirmLabel}
    </button>
  );
}
