'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useEffect, useState } from 'react';
import { useAssignMenusToRoleMutation, useMenusQuery } from '../../../hooks/menus/use-menus';
import { useCreateRoleMutation, useRolesQuery, type RoleDto } from '../../../hooks/roles/use-roles';
import styles from '../admin.module.css';

const emptyRole = { name: '', type: 'EMPLOYEE', description: '' };

const TYPE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Empleado',
};

type ModalState = { kind: 'none' } | { kind: 'create' } | { kind: 'menus'; role: RoleDto };

export default function RolesAdminPage() {
  const rolesQuery = useRolesQuery();
  const menusQuery = useMenusQuery();
  const createRoleMutation = useCreateRoleMutation();
  const assignMenusMutation = useAssignMenusToRoleMutation();

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [form, setForm] = useState(emptyRole);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  const roles = rolesQuery.data ?? [];
  const menus = menusQuery.data ?? [];
  const orderedMenus = [...menus].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isOpen = modal.kind !== 'none';
  const isSubmitting = createRoleMutation.isPending || assignMenusMutation.isPending;
  const errorMessage =
    (createRoleMutation.error instanceof Error ? createRoleMutation.error.message : null) ??
    (assignMenusMutation.error instanceof Error ? assignMenusMutation.error.message : null);

  useEffect(() => {
    if (modal.kind === 'menus') {
      setSelectedMenuIds(modal.role.menus?.map((e) => e.menu.id) ?? []);
    }
  }, [modal]);

  const handleClose = () => {
    setModal({ kind: 'none' });
    setForm(emptyRole);
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createRoleMutation.mutateAsync({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
    });
    handleClose();
  };

  const handleAssignMenus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal.kind !== 'menus') return;
    await assignMenusMutation.mutateAsync({ roleId: modal.role.id, menuIds: selectedMenuIds });
    handleClose();
  };

  const toggleMenu = (menuId: number) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId],
    );
  };

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Mantenimiento</p>
          <h1>Roles</h1>
          <p>Configura perfiles y asigna los menús visibles para cada rol del sistema.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Roles</span>
            <strong>{roles.length}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Menús disponibles</span>
            <strong>{menus.length}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Roles registrados</h2>
            <p>Crea roles y define exactamente qué rutas del sidebar puede ver cada perfil.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={() => setModal({ kind: 'create' })}>
                  Nuevo rol
                </button>
              </Dialog.Trigger>
            </div>

            {rolesQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando roles...</div>
            ) : roles.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay roles registrados.</div>
            ) : (
              <div className={styles.dataList}>
                {roles.map((role) => (
                  <div key={role.id} className={styles.dataRow}>
                    <div style={{ flex: 1 }}>
                      <p className={styles.dataRowTitle}>{role.name}</p>
                      <p className={styles.dataRowMeta}>{role.description || 'Sin descripción'}</p>
                      <div className={styles.chipGroup}>
                        <span className={styles.chip}>{TYPE_LABELS[role.type] ?? role.type}</span>
                        <span className={`${styles.chip} ${styles['chip--muted']}`}>
                          {role.menus?.length ?? 0} menús
                        </span>
                        <span className={`${styles.chip} ${styles['chip--muted']}`}>
                          {role.users?.length ?? 0} usuarios
                        </span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <Dialog.Trigger asChild>
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => setModal({ kind: 'menus', role })}
                        >
                          Asignar menús
                        </button>
                      </Dialog.Trigger>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />

          {modal.kind === 'create' && (
            <Dialog.Content className={styles.modal} aria-describedby={undefined}>
              <div className={styles.modalHeader}>
                <div>
                  <Dialog.Title asChild><h2>Nuevo rol</h2></Dialog.Title>
                  <p>Define el perfil y luego asígnale menús desde la lista.</p>
                </div>
                <Dialog.Close asChild>
                  <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
                </Dialog.Close>
              </div>
              <div className={styles.modalBody}>
                <form className={styles.stack} onSubmit={handleCreateRole}>
                  <div className={styles.formGrid}>
                    <label className={styles.stack}>
                      <span>Nombre</span>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Supervisión"
                        required
                        autoFocus
                      />
                    </label>
                    <label className={styles.stack}>
                      <span>Tipo</span>
                      <select
                        className="input"
                        value={form.type}
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="MANAGER">Gerente</option>
                        <option value="EMPLOYEE">Empleado</option>
                      </select>
                    </label>
                    <label className={`${styles.stack} ${styles.fieldFull}`}>
                      <span>Descripción</span>
                      <textarea
                        className="textarea"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Permite acceso a..."
                      />
                    </label>
                  </div>
                  {errorMessage && <p className={styles.fieldHint}>{errorMessage}</p>}
                  <div className={styles.actionsRow}>
                    <button className="button button--primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : 'Guardar rol'}
                    </button>
                    <button className="button button--ghost" type="button" onClick={handleClose} disabled={isSubmitting}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </Dialog.Content>
          )}

          {modal.kind === 'menus' && (
            <Dialog.Content className={`${styles.modal} ${styles['modal--wide']}`} aria-describedby={undefined}>
              <div className={styles.modalHeader}>
                <div>
                  <Dialog.Title asChild><h2>Menús — {modal.role.name}</h2></Dialog.Title>
                  <p>Usa Agregar o Quitar para definir las rutas visibles. Puedes dejar el rol sin menús.</p>
                </div>
                <Dialog.Close asChild>
                  <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
                </Dialog.Close>
              </div>
              <div className={styles.modalBody}>
                <form className={styles.stack} onSubmit={handleAssignMenus}>
                  <div className={styles.menuSelectionToolbar}>
                    <div>
                      <strong>{selectedMenuIds.length} de {menus.length} menús asignados</strong>
                      <small>Haz clic sobre cualquier fila para cambiar su asignación.</small>
                    </div>
                    <div className={styles.actionsRow}>
                      <button type="button" className="button button--ghost" onClick={() => setSelectedMenuIds(menus.map((menu) => menu.id))}>Asignar todos</button>
                      <button type="button" className="button button--danger" onClick={() => setSelectedMenuIds([])}>Quitar todos</button>
                    </div>
                  </div>
                  <div className={styles.menuGroups}>
                    {orderedMenus.length === 0 && (
                      <p className={styles.emptyState}>No hay menús registrados aún.</p>
                    )}
                    {orderedMenus.map((menu) => {
                      const selected = selectedMenuIds.includes(menu.id);
                      return (
                        <button
                          type="button"
                          key={menu.id}
                          onClick={() => toggleMenu(menu.id)}
                          className={`${styles.menuChoice} ${selected ? styles.menuChoiceSelected : ''}`}
                          aria-pressed={selected}
                        >
                          <span className={styles.menuChoiceIndicator}>{selected ? '✓' : '+'}</span>
                          <span className={styles.menuChoiceText}>
                            <strong>{menu.label}</strong>
                            <small>{menu.path}</small>
                          </span>
                          <span className={styles.menuAssignmentState}>{selected ? 'Asignado' : 'No asignado'}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errorMessage && <p className={styles.fieldHint}>{errorMessage}</p>}
                  <div className={styles.actionsRow}>
                    <button className="button button--primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : `Guardar menús (${selectedMenuIds.length})`}
                    </button>
                    <button className="button button--ghost" type="button" onClick={handleClose} disabled={isSubmitting}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
