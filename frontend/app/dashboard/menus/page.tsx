'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useMenusQuery,
  useReorderMenusMutation,
  useUpdateMenuMutation,
} from '../../../hooks/menus/use-menus';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../_components/confirm-dialog';

const emptyForm = { name: '', label: '', path: '', icon: '', order: '0', parent_id: '' };

type MenuFormState = typeof emptyForm;

type MenuDto = NonNullable<ReturnType<typeof useMenusQuery>['data']>[number];

export default function MenusAdminPage() {
  const menusQuery = useMenusQuery();
  const createMenuMutation = useCreateMenuMutation();
  const updateMenuMutation = useUpdateMenuMutation();
  const deleteMenuMutation = useDeleteMenuMutation();
  const reorderMenusMutation = useReorderMenusMutation();
  const [form, setForm] = useState<MenuFormState>(emptyForm);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Local ordered list for drag & drop
  const [localMenus, setLocalMenus] = useState<MenuDto[]>([]);
  const isDragging = useRef(false);
  const dragId = useRef<number | null>(null);

  // Sync from server whenever data changes and we are not mid-drag
  useEffect(() => {
    if (isDragging.current) return;
    const sorted = [...(menusQuery.data ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setLocalMenus(sorted);
  }, [menusQuery.data]);

  const rootMenus = useMemo(() => localMenus.filter((menu) => !menu.parent_id), [localMenus]);

  useEffect(() => {
    if (!form.path) {
      setForm((current) => ({ ...current, path: '/dashboard/menus' }));
    }
  }, [form.path]);

  const isSubmitting = createMenuMutation.isPending || updateMenuMutation.isPending || deleteMenuMutation.isPending;
  const errorMessage =
    (createMenuMutation.error instanceof Error ? createMenuMutation.error.message : null) ??
    (updateMenuMutation.error instanceof Error ? updateMenuMutation.error.message : null) ??
    (deleteMenuMutation.error instanceof Error ? deleteMenuMutation.error.message : null);

  const openNew = () => {
    setEditingMenuId(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (menu: MenuDto) => {
    setEditingMenuId(menu.id);
    setForm({ name: menu.name, label: menu.label, path: menu.path, icon: menu.icon ?? '', order: String(menu.order ?? 0), parent_id: menu.parent_id?.toString() ?? '' });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingMenuId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), label: form.label.trim(), path: form.path.trim(), icon: form.icon.trim() || undefined, order: Number(form.order || 0), parent_id: form.parent_id.trim() ? Number(form.parent_id) : undefined };
    if (editingMenuId) {
      await updateMenuMutation.mutateAsync({ menuId: editingMenuId, data: payload });
    } else {
      await createMenuMutation.mutateAsync(payload);
    }
    handleClose();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMenuMutation.mutateAsync(deleteTarget.id);
    if (editingMenuId === deleteTarget.id) handleClose();
    setDeleteTarget(null);
  };

  // Drag & drop handlers
  const handleDragStart = (menuId: number) => {
    dragId.current = menuId;
    isDragging.current = true;
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId.current === null || dragId.current === targetId) return;
    setLocalMenus((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === dragId.current);
      const toIdx = prev.findIndex((m) => m.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDragEnd = async () => {
    isDragging.current = false;
    if (dragId.current === null) return;
    dragId.current = null;

    // Assign order = array index, batch-update only changed items in one request
    const changed = localMenus
      .map((menu, index) => ({ id: menu.id, order: index, prevOrder: menu.order ?? 0 }))
      .filter(({ order, prevOrder }) => order !== prevOrder);

    if (changed.length === 0) return;

    await reorderMenusMutation.mutateAsync({
      items: changed.map(({ id, order }) => ({ id, order })),
    });
  };

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Mantenimiento</p>
          <h1>Menús</h1>
          <p>Define las rutas disponibles para el sidebar y organiza los accesos por rol.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Total de menús</span>
            <strong>{localMenus.length}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Menús raíz</span>
            <strong>{rootMenus.length}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Listado de menús</h2>
            <p>Arrastra los elementos para reordenarlos. El número de orden se actualiza automáticamente.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={openNew}>
                  Nuevo menú
                </button>
              </Dialog.Trigger>
            </div>

            {menusQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando menús...</div>
            ) : localMenus.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay menús registrados.</div>
            ) : (
              <div className={styles.dataList}>
                {localMenus.map((menu, index) => (
                  <div
                    key={menu.id}
                    className={`${styles.dataRow} ${styles.draggableRow}`}
                    draggable
                    onDragStart={() => handleDragStart(menu.id)}
                    onDragOver={(e) => handleDragOver(e, menu.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className={styles.dragHandle} aria-hidden>⠿</span>
                    <div style={{ flex: 1 }}>
                      <p className={styles.dataRowTitle}>{menu.label}</p>
                      <p className={styles.dataRowMeta}>{menu.path}</p>
                      <div className={styles.chipGroup}>
                        <span className={styles.chip}>{menu.name}</span>
                        <span className={styles.chip}>{menu.icon || 'sin icono'}</span>
                        <span className={styles.chip}>orden {index}</span>
                        <span className={`${styles.chip} ${menu.parent_id ? '' : styles['chip--muted']}`}>
                          {menu.parent_id ? 'submenú' : 'raíz'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button className="button button--ghost" type="button" onClick={() => openEdit(menu)}>
                        Editar
                      </button>
                      <button className="button button--ghost" type="button" onClick={() => setDeleteTarget({ id: menu.id, name: menu.label })}>
                        Desactivar
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
                  <h2>{editingMenuId ? 'Editar menú' : 'Nuevo menú'}</h2>
                </Dialog.Title>
                <p>{editingMenuId ? `Modificando: ${form.label}` : 'Crea nuevas entradas de navegación y cuélgalas de un menú padre si hace falta.'}</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <label className={styles.stack}>
                    <span>Nombre interno</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="menus"
                      required
                      autoFocus
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Etiqueta</span>
                    <input
                      className="input"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="Menús"
                      required
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Ruta</span>
                    <input
                      className="input"
                      value={form.path}
                      onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                      placeholder="/dashboard/menus"
                      required
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Icono</span>
                    <input
                      className="input"
                      value={form.icon}
                      onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                      placeholder="gear"
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Orden</span>
                    <input
                      className="input"
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Menú padre</span>
                    <select
                      className="input"
                      value={form.parent_id}
                      onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                    >
                      <option value="">Sin padre</option>
                      {rootMenus.map((menu) => (
                        <option key={menu.id} value={menu.id}>
                          {menu.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {errorMessage ? <p className={styles.fieldHint}>{errorMessage}</p> : null}

                <div className={styles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : editingMenuId ? 'Actualizar' : 'Guardar'}
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
        title="Desactivar menú"
        description={`Se desactivará "${deleteTarget?.name ?? ''}". Dejará de aparecer como opción disponible.`}
        confirmLabel="Desactivar"
        loading={deleteMenuMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}
