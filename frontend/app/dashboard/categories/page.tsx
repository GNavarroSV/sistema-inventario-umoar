'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useState } from 'react';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../_components/confirm-dialog';
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '../../../hooks/categories/use-categories';

const emptyForm = { name: '', description: '', isActive: true };

export default function CategoriesAdminPage() {
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const categories = categoriesQuery.data ?? [];
  const activeCount = categories.filter((item) => item.isActive !== false).length;

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

  const openEdit = (category: (typeof categories)[number]) => {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description ?? '', isActive: category.isActive !== false });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, isActive: form.isActive };
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
          <h1>Categorías</h1>
          <p>Registra categorías simples para clasificar activos y seleccionarlas luego en el formulario.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Total</span>
            <strong>{categories.length}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Activas</span>
            <strong>{activeCount}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Listado</h2>
            <p>Haz cambios rápidos en categorías que ya existen.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={openNew}>
                  Nueva categoría
                </button>
              </Dialog.Trigger>
            </div>

            {categoriesQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando categorías...</div>
            ) : categories.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay categorías registradas.</div>
            ) : (
              <div className={styles.dataList}>
                {categories.map((category) => (
                  <div key={category.id} className={styles.dataRow}>
                    <div>
                      <p className={styles.dataRowTitle}>{category.name}</p>
                      <p className={styles.dataRowMeta}>{category.description || 'Sin descripción'}</p>
                      <div className={styles.chipGroup}>
                        <span className={styles.chip}>{category.isActive === false ? 'Inactiva' : 'Activa'}</span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button className="button button--ghost" type="button" onClick={() => openEdit(category)}>
                        Editar
                      </button>
                      <button className="button button--ghost" type="button" onClick={() => setDeleteTarget({ id: category.id, name: category.name })}>
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
                  <h2>{editingId ? 'Editar categoría' : 'Nueva categoría'}</h2>
                </Dialog.Title>
                <p>{editingId ? `Modificando: ${form.name}` : 'Usa un nombre corto y entendible para el equipo.'}</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <label className={styles.stack}>
                    <span>Nombre</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Cómputo"
                      required
                      autoFocus
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Estado</span>
                    <select
                      className="input"
                      value={String(form.isActive)}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                    >
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </label>

                  <label className={`${styles.stack} ${styles.fieldFull}`}>
                    <span>Descripción</span>
                    <textarea
                      className="textarea"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Clasificación general..."
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
        title="Eliminar categoría"
        description={`Se eliminará "${deleteTarget?.name ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}
