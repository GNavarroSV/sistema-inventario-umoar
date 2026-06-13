'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useMemo, useState } from 'react';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../_components/confirm-dialog';
import {
  useCreatePersonMutation,
  useDeletePersonMutation,
  usePeopleQuery,
  useUpdatePersonMutation,
} from '../../../hooks/people/use-people';

const emptyForm = { name: '', email: '', documentNumber: '', phone: '', isActive: true };

export default function PeopleAdminPage() {
  const peopleQuery = usePeopleQuery();
  const createMutation = useCreatePersonMutation();
  const updateMutation = useUpdatePersonMutation();
  const deleteMutation = useDeletePersonMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const people = peopleQuery.data ?? [];
  const activeCount = useMemo(() => people.filter((item) => item.isActive !== false).length, [people]);

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

  const openEdit = (person: (typeof people)[number]) => {
    setEditingId(person.id);
    setForm({ name: person.name, email: person.email ?? '', documentNumber: person.documentNumber ?? '', phone: person.phone ?? '', isActive: person.isActive !== false });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), email: form.email.trim() || undefined, documentNumber: form.documentNumber.trim() || undefined, phone: form.phone.trim() || undefined, isActive: form.isActive };
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
          <h1>Personas</h1>
          <p>Registra y administra responsables, contactos y referencias para usar en activos y asignaciones.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Total</span>
            <strong>{people.length}</strong>
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
            <p>Revisa los contactos registrados y haz cambios rápidos cuando sea necesario.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={openNew}>
                  Nueva persona
                </button>
              </Dialog.Trigger>
            </div>

            {peopleQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando personas...</div>
            ) : people.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay personas registradas.</div>
            ) : (
              <div className={styles.dataList}>
                {people.map((person) => (
                  <div key={person.id} className={styles.dataRow}>
                    <div>
                      <p className={styles.dataRowTitle}>{person.name}</p>
                      <p className={styles.dataRowMeta}>
                        {person.email || 'Sin correo'} · {person.documentNumber || 'Sin documento'}
                      </p>
                      <div className={styles.chipGroup}>
                        <span className={styles.chip}>{person.phone || 'Sin teléfono'}</span>
                        <span className={styles.chip}>{person.isActive === false ? 'Inactiva' : 'Activa'}</span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button className="button button--ghost" type="button" onClick={() => openEdit(person)}>
                        Editar
                      </button>
                      <button className="button button--ghost" type="button" onClick={() => setDeleteTarget({ id: person.id, name: person.name })}>
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
                  <h2>{editingId ? 'Editar persona' : 'Nueva persona'}</h2>
                </Dialog.Title>
                <p>{editingId ? `Modificando: ${form.name}` : 'Usa nombre completo y completa solo los datos disponibles.'}</p>
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
                      placeholder="Juan Pérez"
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

                  <label className={styles.stack}>
                    <span>Correo</span>
                    <input
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="correo@universidad.edu"
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Documento</span>
                    <input
                      className="input"
                      value={form.documentNumber}
                      onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
                      placeholder="123456789"
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Teléfono</span>
                    <input
                      className="input"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="3000000000"
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
        title="Eliminar persona"
        description={`Se eliminará "${deleteTarget?.name ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}
