'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useState } from 'react';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../_components/confirm-dialog';
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useSuppliersQuery,
  useUpdateSupplierMutation,
} from '../../../hooks/suppliers/use-suppliers';

const emptyForm = { name: '', taxId: '', isActive: true };

export default function SuppliersPage() {
  const suppliersQuery = useSuppliersQuery();
  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const deleteMutation = useDeleteSupplierMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const suppliers = suppliersQuery.data ?? [];
  const activeCount = suppliers.filter((supplier) => supplier.isActive !== false).length;
  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const errorMessage =
    (createMutation.error instanceof Error ? createMutation.error.message : null) ??
    (updateMutation.error instanceof Error ? updateMutation.error.message : null) ??
    (deleteMutation.error instanceof Error ? deleteMutation.error.message : null);

  const closeModal = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (supplier: (typeof suppliers)[number]) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      taxId: supplier.taxId ?? '',
      isActive: supplier.isActive !== false,
    });
    setIsOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      taxId: form.taxId.trim() || undefined,
      isActive: form.isActive,
    };
    if (editingId) await updateMutation.mutateAsync({ id: editingId, data: payload });
    else await createMutation.mutateAsync(payload);
    closeModal();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    if (editingId === deleteTarget.id) closeModal();
    setDeleteTarget(null);
  };

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Mantenimiento</p>
          <h1>Proveedores</h1>
          <p>Administra el catálogo que se utiliza al registrar o editar un activo.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}><span>Total</span><strong>{suppliers.length}</strong></div>
          <div className={styles.heroCard}><span>Activos</span><strong>{activeCount}</strong></div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Listado</h2>
            <p>Los proveedores activos aparecerán en la lista desplegable de activos.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: 16 }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={openNew}>Nuevo proveedor</button>
              </Dialog.Trigger>
            </div>

            {suppliersQuery.isLoading ? <div className={styles.emptyState}>Cargando proveedores...</div>
              : suppliers.length === 0 ? <div className={styles.emptyState}>Todavía no hay proveedores registrados.</div>
                : <div className={styles.dataList}>{suppliers.map((supplier) => (
                  <div key={supplier.id} className={styles.dataRow}>
                    <div>
                      <p className={styles.dataRowTitle}>{supplier.name}</p>
                      <p className={styles.dataRowMeta}>{supplier.taxId ? `NIT: ${supplier.taxId}` : 'Sin NIT registrado'}</p>
                      <div className={styles.chipGroup}><span className={styles.chip}>{supplier.isActive === false ? 'Inactivo' : 'Activo'}</span></div>
                    </div>
                    <div className={styles.rowActions}>
                      <button className="button button--ghost" type="button" onClick={() => openEdit(supplier)}>Editar</button>
                      <button className="button button--ghost" type="button" onClick={() => setDeleteTarget({ id: supplier.id, name: supplier.name })}>Eliminar</button>
                    </div>
                  </div>
                ))}</div>}
          </div>
        </section>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={styles.modal} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild><h2>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2></Dialog.Title>
                <p>{editingId ? `Modificando: ${form.name}` : 'Registra los datos básicos del proveedor.'}</p>
              </div>
              <Dialog.Close asChild><button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button></Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={submit}>
                <div className={styles.formGrid}>
                  <label className={styles.stack}>
                    <span>Nombre</span>
                    <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required autoFocus />
                  </label>
                  <label className={styles.stack}>
                    <span>NIT</span>
                    <input className="input" value={form.taxId} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} placeholder="Opcional" />
                  </label>
                  <label className={styles.stack}>
                    <span>Estado</span>
                    <select className="input" value={String(form.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </label>
                </div>
                {errorMessage ? <p className={styles.fieldHint}>{errorMessage}</p> : null}
                <div className={styles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}</button>
                  <button className="button button--ghost" type="button" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar proveedor"
        description={`Se eliminará "${deleteTarget?.name ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}
