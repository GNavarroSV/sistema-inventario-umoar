'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useMemo, useState } from 'react';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../_components/confirm-dialog';
import {
  useCostCentersQuery,
  useCreateCostCenterMutation,
  useDeleteCostCenterMutation,
  useUpdateCostCenterMutation,
} from '../../../hooks/cost-centers/use-cost-centers';

const emptyForm = { code: '', name: '', description: '', isActive: true };

export default function CostCentersAdminPage() {
  const costCentersQuery = useCostCentersQuery();
  const createMutation = useCreateCostCenterMutation();
  const updateMutation = useUpdateCostCenterMutation();
  const deleteMutation = useDeleteCostCenterMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const costCenters = costCentersQuery.data ?? [];
  const activeCount = useMemo(() => costCenters.filter((item) => item.isActive !== false).length, [costCenters]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const errorMessage =
    (createMutation.error instanceof Error ? createMutation.error.message : null) ??
    (updateMutation.error instanceof Error ? updateMutation.error.message : null) ??
    (deleteMutation.error instanceof Error ? deleteMutation.error.message : null);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (costCenter: (typeof costCenters)[number]) => {
    setEditingId(costCenter.id);
    setForm({ code: costCenter.code, name: costCenter.name, description: costCenter.description ?? '', isActive: costCenter.isActive !== false });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { code: form.code.trim(), name: form.name.trim(), description: form.description.trim() || undefined, isActive: form.isActive };
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleClose();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    if (editingId === deleteTarget.id) handleClose();
    setDeleteTarget(null);
  };

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Mantenimiento</p>
          <h1>Centros de costo</h1>
          <p>Registra, edita y retira centros de costo de forma simple para usarlo luego en activos.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Total</span>
            <strong>{costCenters.length}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Activos</span>
            <strong>{activeCount}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Listado</h2>
            <p>Haz cambios rápidos o elimina registros que ya no se usan.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={openNew}>
                  Nuevo centro de costo
                </button>
              </Dialog.Trigger>
            </div>

            {costCentersQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando centros de costo...</div>
            ) : costCenters.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay centros de costo registrados.</div>
            ) : (
              <div className={styles.dataList}>
                {costCenters.map((costCenter) => (
                  <div key={costCenter.id} className={styles.dataRow}>
                    <div>
                      <p className={styles.dataRowTitle}>{costCenter.code} — {costCenter.name}</p>
                      <p className={styles.dataRowMeta}>{costCenter.description || 'Sin descripción'}</p>
                      <div className={styles.chipGroup}>
                        <span className={styles.chip}>{costCenter.isActive === false ? 'Inactivo' : 'Activo'}</span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button className="button button--ghost" type="button" onClick={() => openEdit(costCenter)}>
                        Editar
                      </button>
                      <button className="button button--ghost" type="button" onClick={() => setDeleteTarget({ id: costCenter.id, name: `${costCenter.code} — ${costCenter.name}` })}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={styles.modal} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild>
                  <h2>{editingId ? 'Editar centro de costo' : 'Nuevo centro de costo'}</h2>
                </Dialog.Title>
                <p>{editingId ? `Modificando: ${form.code} — ${form.name}` : 'Usa código corto y nombre claro para identificarlo rápidamente.'}</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <label className={styles.stack}>
                    <span>Código</span>
                    <input
                      className="input"
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="CC-001"
                      required
                      autoFocus
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Nombre</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Administración"
                      required
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Estado</span>
                    <select
                      className="input"
                      value={String(form.isActive)}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </label>

                  <label className={`${styles.stack} ${styles.fieldFull}`}>
                    <span>Descripción</span>
                    <textarea
                      className="textarea"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Centro de costo para..."
                    />
                  </label>
                </div>

                {errorMessage ? <p className={styles.fieldHint}>{errorMessage}</p> : null}

                <div className={styles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button className="button button--ghost" type="button" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar centro de costo"
        description={`Se eliminará "${deleteTarget?.name ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}
