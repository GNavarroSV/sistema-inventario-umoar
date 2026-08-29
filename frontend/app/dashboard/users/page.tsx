'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../../contexts/auth-context';
import { useRolesQuery } from '../../../hooks/roles/use-roles';
import {
  UserDto,
  useCreateUserMutation,
  useUpdateUserPasswordMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useUsersQuery,
} from '../../../hooks/users/use-users';
import styles from '../admin.module.css';

const emptyUser = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roleId: '' as number | '',
};

export default function UsersAdminPage() {
  const auth = useAuthContext();
  const usersQuery = useUsersQuery();
  const rolesQuery = useRolesQuery();
  const createUserMutation = useCreateUserMutation();
  const updateUserPasswordMutation = useUpdateUserPasswordMutation();
  const updateUserRoleMutation = useUpdateUserRoleMutation();
  const updateUserStatusMutation = useUpdateUserStatusMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [showPasswords, setShowPasswords] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, number>>({});

  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);
  const isPrincipalAdmin =
    auth.session?.user?.email === 'admin@umoar.edu.sv' &&
    auth.session?.user?.role?.name === 'Administrador principal';

  useEffect(() => {
    if (!form.roleId && roles.length > 0) {
      setForm((f) => ({ ...f, roleId: roles[0].id }));
    }
  }, [form.roleId, roles]);

  useEffect(() => {
    setRoleDrafts(
      users.reduce<Record<number, number>>((acc, user) => {
        acc[user.id] = user.role.id;
        return acc;
      }, {}),
    );
  }, [users]);

  const isSubmitting =
    createUserMutation.isPending ||
    updateUserPasswordMutation.isPending ||
    updateUserRoleMutation.isPending ||
    updateUserStatusMutation.isPending;
  const mutationError =
    (createUserMutation.error instanceof Error ? createUserMutation.error.message : null) ??
    (updateUserPasswordMutation.error instanceof Error ? updateUserPasswordMutation.error.message : null) ??
    (updateUserRoleMutation.error instanceof Error ? updateUserRoleMutation.error.message : null) ??
    (updateUserStatusMutation.error instanceof Error ? updateUserStatusMutation.error.message : null);
  const errorMessage = formError ?? mutationError;

  const handleClose = () => {
    setIsOpen(false);
    setForm((f) => ({ ...emptyUser, roleId: f.roleId }));
    setFormError(null);
    setShowPasswords(false);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setFormError('Las contraseñas no coinciden');
      return;
    }
    setFormError(null);
    await createUserMutation.mutateAsync({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      roleId: form.roleId === '' ? undefined : form.roleId,
    });
    handleClose();
  };

  const handleSaveRole = async (userId: number) => {
    const roleId = roleDrafts[userId];
    if (!roleId) return;
    await updateUserRoleMutation.mutateAsync({ userId, roleId });
  };

  const handleToggleStatus = async (userId: number, isActive: boolean) => {
    await updateUserStatusMutation.mutateAsync({ userId, isActive });
  };

  const openResetPassword = (user: UserDto) => {
    updateUserPasswordMutation.reset();
    setFormError(null);
    setResetSuccess(null);
    setResetPassword('');
    setResetPasswordConfirm('');
    setShowPasswords(false);
    setResetTarget(user);
  };

  const handleCloseReset = () => {
    setResetTarget(null);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetSuccess(null);
    updateUserPasswordMutation.reset();
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetTarget) return;
    if (resetPassword !== resetPasswordConfirm) {
      setFormError('Las contraseñas no coinciden');
      return;
    }

    setFormError(null);
    await updateUserPasswordMutation.mutateAsync({ userId: resetTarget.id, password: resetPassword });
    setResetSuccess(`Contraseña actualizada para ${resetTarget.email}.`);
    setResetPassword('');
    setResetPasswordConfirm('');
  };

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Mantenimiento</p>
          <h1>Usuarios</h1>
          <p>Registra cuentas y cambia el rol asignado sin salir del panel administrativo.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Usuarios</span>
            <strong>{users.length}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Roles</span>
            <strong>{roles.length}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Listado de usuarios</h2>
            <p>Cambia el rol directamente desde cada fila o crea nuevas cuentas con el botón.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={() => setIsOpen(true)}>
                  Nuevo usuario
                </button>
              </Dialog.Trigger>
            </div>

            {usersQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div className={styles.emptyState}>Todavía no hay usuarios registrados.</div>
            ) : (
              <div className={styles.dataList}>
                {users.map((user) => {
                  const draft = roleDrafts[user.id] ?? user.role.id;
                  const changed = draft !== user.role.id;
                  const isCurrentUser = user.id === auth.session?.user?.id;
                  const isAdminUser = user.role.type === 'ADMIN';
                  const isPrincipalAccount =
                    user.email === 'admin@umoar.edu.sv' || user.role.name === 'Administrador principal';
                  const canChangePassword = isCurrentUser || isPrincipalAdmin;
                  const cannotDeactivate = user.isActive && (isCurrentUser || isAdminUser);
                  return (
                    <div key={user.id} className={styles.dataRow}>
                      <div style={{ flex: 1 }}>
                        <p className={styles.dataRowTitle}>{user.name}</p>
                        <p className={styles.dataRowMeta}>{user.email}</p>
                        <div className={styles.chipGroup}>
                          <span className={styles.chip}>{user.role.name}</span>
                          <span className={`${styles.chip} ${user.isActive ? '' : styles['chip--muted']}`}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          {isCurrentUser && <span className={styles.chip}>Sesión actual</span>}
                        </div>
                      </div>
                      <div className={styles.rowActions}>
                        {isPrincipalAccount ? (
                          <span className={styles.chip}>Rol fijo</span>
                        ) : (
                          <>
                            <select
                              className="input"
                              style={{ minWidth: '160px' }}
                              value={draft}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({ ...prev, [user.id]: Number(e.target.value) }))
                              }
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            {changed && (
                              <button
                                className="button button--primary"
                                type="button"
                                onClick={() => handleSaveRole(user.id)}
                                disabled={isSubmitting}
                              >
                                {updateUserRoleMutation.isPending ? 'Guardando...' : 'Guardar'}
                              </button>
                            )}
                          </>
                        )}
                        {canChangePassword && (
                          <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => openResetPassword(user)}
                            disabled={isSubmitting}
                          >
                            {isCurrentUser ? 'Cambiar contraseña' : 'Restablecer contraseña'}
                          </button>
                        )}
                        <button
                          className={user.isActive ? 'button button--ghost' : 'button button--primary'}
                          type="button"
                          onClick={() => handleToggleStatus(user.id, !user.isActive)}
                          disabled={isSubmitting || cannotDeactivate}
                          title={cannotDeactivate ? 'No se puede inactivar un administrador ni tu propia sesión.' : undefined}
                        >
                          {updateUserStatusMutation.isPending ? 'Procesando...' : user.isActive ? 'Inactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {mutationError && !formError && <p className={styles.fieldHint} style={{ marginTop: '12px' }}>{mutationError}</p>}
          </div>
        </section>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={styles.modal} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild><h2>Nuevo usuario</h2></Dialog.Title>
                <p>Completa los datos de la cuenta. El rol se puede cambiar después.</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={handleCreateUser}>
                <div className={styles.formGrid}>
                  <label className={styles.stack}>
                    <span>Nombre</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, name: e.target.value })); }}
                      placeholder="Juan Pérez"
                      required
                      autoFocus
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Email</span>
                    <input
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, email: e.target.value })); }}
                      placeholder="correo@universidad.edu"
                      required
                    />
                  </label>

                  <label className={styles.stack}>
                    <span>Contraseña</span>
                    <div className={styles.passwordField}>
                      <input
                        className={`input ${styles.passwordInput}`}
                        type={showPasswords ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, password: e.target.value })); }}
                        required
                      />
                      <button className={styles.passwordToggle} type="button" onClick={() => setShowPasswords((v) => !v)} aria-label={showPasswords ? 'Ocultar' : 'Mostrar'}>
                        {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                  </label>

                  <label className={styles.stack}>
                    <span>Confirmar contraseña</span>
                    <div className={styles.passwordField}>
                      <input
                        className={`input ${styles.passwordInput}`}
                        type={showPasswords ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, confirmPassword: e.target.value })); }}
                        required
                      />
                      <button className={styles.passwordToggle} type="button" onClick={() => setShowPasswords((v) => !v)} aria-label={showPasswords ? 'Ocultar' : 'Mostrar'}>
                        {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                  </label>

                  <label className={`${styles.stack} ${styles.fieldFull}`}>
                    <span>Rol</span>
                    <select
                      className="input"
                      value={form.roleId}
                      onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, roleId: e.target.value ? Number(e.target.value) : '' })); }}
                    >
                      <option value="">Selecciona un rol</option>
                      {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {errorMessage && <p className={styles.fieldHint}>{errorMessage}</p>}

                <div className={styles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={isSubmitting}>
                    {createUserMutation.isPending ? 'Guardando...' : 'Crear usuario'}
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

      <Dialog.Root open={Boolean(resetTarget)} onOpenChange={(open) => { if (!open) handleCloseReset(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={styles.modal} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild>
                  <h2>{resetTarget?.id === auth.session?.user?.id ? 'Cambiar contraseña' : 'Restablecer contraseña'}</h2>
                </Dialog.Title>
                <p>{resetTarget ? `Usuario: ${resetTarget.name} — ${resetTarget.email}` : 'Actualiza la contraseña del usuario.'}</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.stack} onSubmit={handleResetPassword}>
                <label className={styles.stack}>
                  <span>Nueva contraseña</span>
                  <div className={styles.passwordField}>
                    <input
                      className={`input ${styles.passwordInput}`}
                      type={showPasswords ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => {
                        setFormError(null);
                        setResetSuccess(null);
                        setResetPassword(e.target.value);
                      }}
                      minLength={6}
                      required
                    />
                    <button className={styles.passwordToggle} type="button" onClick={() => setShowPasswords((v) => !v)} aria-label={showPasswords ? 'Ocultar' : 'Mostrar'}>
                      {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
                </label>

                <label className={styles.stack}>
                  <span>Confirmar contraseña</span>
                  <div className={styles.passwordField}>
                    <input
                      className={`input ${styles.passwordInput}`}
                      type={showPasswords ? 'text' : 'password'}
                      value={resetPasswordConfirm}
                      onChange={(e) => {
                        setFormError(null);
                        setResetSuccess(null);
                        setResetPasswordConfirm(e.target.value);
                      }}
                      minLength={6}
                      required
                    />
                    <button className={styles.passwordToggle} type="button" onClick={() => setShowPasswords((v) => !v)} aria-label={showPasswords ? 'Ocultar' : 'Mostrar'}>
                      {showPasswords ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
                </label>

                <p className={styles.fieldHint}>
                  {resetTarget?.id === auth.session?.user?.id
                    ? 'Usa una contraseña que recuerdes y no la compartas con otras personas.'
                    : 'Comparte la nueva contraseña únicamente por un canal seguro.'}
                </p>

                {formError && <p className={styles.confirmError}>{formError}</p>}
                {resetSuccess && <p className={styles.fieldHint}>{resetSuccess}</p>}
                {mutationError && !formError && <p className={styles.confirmError}>{mutationError}</p>}

                <div className={styles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={isSubmitting}>
                    {updateUserPasswordMutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                  <button className="button button--ghost" type="button" onClick={handleCloseReset} disabled={isSubmitting}>
                    Cerrar
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
