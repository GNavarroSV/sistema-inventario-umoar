'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useCallback, useDeferredValue, useState } from 'react';
import styles from '../admin.module.css';
import { useAssetsQuery } from '../../../hooks/assets/assets';
import { usePeopleQuery } from '../../../hooks/people/use-people';
import {
  useAssignmentsQuery,
  useAssetDistributionQuery,
  useCreateTransferMutation,
  useMarkAssignmentReturnedMutation,
  useUploadDocumentMutation,
  type AssignmentDto,
  type CloudinaryUploadResult,
  type TransferSourceDto,
} from '../../../hooks/assignments/use-assignments';

const emptyForm = {
  assetId: '',
  toPersonId: '',
  type: 'CUSTODY' as 'CUSTODY' | 'LOAN',
  quantity: '1',
  dueDate: '',
  reason: '',
  notes: '',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

type SourceEntry = { assignmentId: number; quantity: number; maxQuantity: number; personName: string };
type ReturnMode = 'FREE_POOL' | 'PREVIOUS_CUSTODY';

const emptyListFilters = { asset: '', person: '', quantity: '', type: '', dueDate: '', status: '', document: '' };
const assignmentStatusLabels: Record<string, string> = { ACTIVE: 'Activo', RETURNED: 'Devuelto', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' };
const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export default function AssignmentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listFilters, setListFilters] = useState(emptyListFilters);
  const deferredListFilters = useDeferredValue(listFilters);
  const assignmentsQuery = useAssignmentsQuery({ skip: (page - 1) * pageSize, take: pageSize, ...deferredListFilters });
  const assetsQuery = useAssetsQuery({ take: 500 });
  const peopleQuery = usePeopleQuery(true);
  const transferMutation = useCreateTransferMutation();
  const returnMutation = useMarkAssignmentReturnedMutation();
  const uploadMutation = useUploadDocumentMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [uploadedDoc, setUploadedDoc] = useState<CloudinaryUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [returnAssignment, setReturnAssignment] = useState<AssignmentDto | null>(null);
  const [returnMode, setReturnMode] = useState<ReturnMode>('FREE_POOL');
  const [returnDate, setReturnDate] = useState(todayIsoDate());
  const [returnNotes, setReturnNotes] = useState('');

  const assetId = form.assetId ? Number(form.assetId) : undefined;
  const distributionQuery = useAssetDistributionQuery(assetId);

  const assignments = assignmentsQuery.data?.data ?? [];
  const assignmentTotal = assignmentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(assignmentTotal / pageSize));
  const assets = (assetsQuery.data as { data?: any[] } | undefined)?.data ?? [];
  const people = peopleQuery.data ?? [];

  const distribution = distributionQuery.data;
  const requestedQty = Number(form.quantity) || 0;
  const sourcesQty = sources.reduce((s, src) => s + src.quantity, 0);
  const availableFromPool = distribution?.unassigned ?? 0;
  const totalAvailable = availableFromPool + sourcesQty;
  const needsMore = requestedQty > availableFromPool && requestedQty <= totalAvailable;
  const overLimit = requestedQty > totalAvailable;

  const changeListFilter = (field: keyof typeof listFilters, value: string) => {
    setListFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const handleAssetChange = useCallback((assetId: string) => {
    setForm((f) => ({ ...f, assetId, quantity: '1' }));
    setSources([]);
    setUploadedDoc(null);
    setUploadError(null);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadedDoc(null);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadedDoc(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo';
      setUploadError(`${message}. Puedes crear la transferencia sin documento de respaldo.`);
    }
    event.target.value = '';
  };

  const addSource = (assignmentId: number, personName: string, maxQuantity: number) => {
    if (sources.some((s) => s.assignmentId === assignmentId)) return;
    setSources((prev) => [...prev, { assignmentId, personName, maxQuantity, quantity: 1 }]);
  };

  const removeSource = (assignmentId: number) => {
    setSources((prev) => prev.filter((s) => s.assignmentId !== assignmentId));
  };

  const updateSourceQty = (assignmentId: number, quantity: number) => {
    setSources((prev) =>
      prev.map((s) => (s.assignmentId === assignmentId ? { ...s, quantity } : s)),
    );
  };

  const handleClose = () => {
    setIsOpen(false);
    setForm(emptyForm);
    setSources([]);
    setUploadedDoc(null);
    setUploadError(null);
  };

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const transferSources: TransferSourceDto[] = sources.map((s) => ({
      assignmentId: s.assignmentId,
      quantity: s.quantity,
    }));

    await transferMutation.mutateAsync({
      assetId: Number(form.assetId),
      toPersonId: Number(form.toPersonId),
      quantity: requestedQty,
      type: form.type,
      dueDate: form.type === 'LOAN' ? form.dueDate || undefined : undefined,
      reason: form.reason.trim() || undefined,
      notes: form.notes.trim() || undefined,
      documentUrl: uploadedDoc?.url,
      documentPublicId: uploadedDoc?.publicId,
      sources: transferSources.length > 0 ? transferSources : undefined,
    });

    handleClose();
  };

  const openReturnModal = (assignment: AssignmentDto) => {
    setReturnAssignment(assignment);
    setReturnDate(todayIsoDate());
    setReturnNotes('');
    setReturnMode(assignment.previousResponsiblePerson ? 'PREVIOUS_CUSTODY' : 'FREE_POOL');
  };

  const closeReturnModal = () => {
    setReturnAssignment(null);
    setReturnMode('FREE_POOL');
    setReturnDate(todayIsoDate());
    setReturnNotes('');
  };

  const handleReturn = async () => {
    if (!returnAssignment) return;
    await returnMutation.mutateAsync({
      id: returnAssignment.id,
      data: {
        returnDate: returnDate || undefined,
        restorePreviousCustody: returnMode === 'PREVIOUS_CUSTODY',
        notes: returnNotes.trim() || (returnMode === 'PREVIOUS_CUSTODY' ? 'Retorno a custodia previa desde el panel' : 'Retorno a inventario libre desde el panel'),
      },
    });
    closeReturnModal();
  };

  const isSubmitting = transferMutation.isPending || returnMutation.isPending;
  const errorMessage =
    (transferMutation.error instanceof Error ? transferMutation.error.message : null) ??
    (returnMutation.error instanceof Error ? returnMutation.error.message : null) ??
    (assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : null);

  return (
    <main className={styles.adminPage}>
      <section className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Operación</p>
          <h1>Transferencias y custodia</h1>
          <p>Transfiere unidades de activos entre personas respetando las cantidades disponibles.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <div className={styles.heroCard}>
            <span>Resultados</span>
            <strong>{assignmentTotal}</strong>
          </div>
          <div className={styles.heroCard}>
            <span>Página</span>
            <strong>{page} / {totalPages}</strong>
          </div>
        </div>
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <section className={`${styles.panel} ${styles['contentGrid--single']}`}>
          <div className={styles.panelHeader}>
            <h2>Asignaciones activas</h2>
            <p>Los préstamos vuelven al pool cuando vencen o se marcan como devueltos.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.actionsRow} style={{ marginBottom: '16px' }}>
              <Dialog.Trigger asChild>
                <button className="button button--primary" type="button" onClick={() => setIsOpen(true)}>
                  Nueva transferencia
                </button>
              </Dialog.Trigger>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Asignado a</th>
                    <th>Cant.</th>
                    <th>Tipo</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th>Doc.</th>
                    <th></th>
                  </tr>
                  <tr className={styles.filterRow}>
                    <th><input aria-label="Filtrar por activo" value={listFilters.asset} onChange={(e) => changeListFilter('asset', e.target.value)} placeholder="Código o nombre" /></th>
                    <th><input aria-label="Filtrar por persona" value={listFilters.person} onChange={(e) => changeListFilter('person', e.target.value)} placeholder="Buscar..." /></th>
                    <th><input aria-label="Filtrar por cantidad" type="number" min="1" value={listFilters.quantity} onChange={(e) => changeListFilter('quantity', e.target.value)} placeholder="Exacta" /></th>
                    <th><select aria-label="Filtrar por tipo" value={listFilters.type} onChange={(e) => changeListFilter('type', e.target.value)}><option value="">Todos</option><option value="LOAN">Préstamo</option><option value="CUSTODY">Custodia</option></select></th>
                    <th><input aria-label="Filtrar por vencimiento" type="date" value={listFilters.dueDate} onChange={(e) => changeListFilter('dueDate', e.target.value)} /></th>
                    <th><select aria-label="Filtrar por estado" value={listFilters.status} onChange={(e) => changeListFilter('status', e.target.value)}><option value="">Todos</option>{Object.entries(assignmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></th>
                    <th><select aria-label="Filtrar por documento" value={listFilters.document} onChange={(e) => changeListFilter('document', e.target.value)}><option value="">Todos</option><option value="WITH">Con documento</option><option value="WITHOUT">Sin documento</option></select></th>
                    <th><button type="button" className={styles.clearFilters} onClick={() => { setListFilters(emptyListFilters); setPage(1); }}>Limpiar</button></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No hay asignaciones registradas.</td>
                    </tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.asset.code}</td>
                        <td>{a.assignedToPerson.name}</td>
                        <td>{a.quantity}</td>
                        <td>{a.type === 'LOAN' ? 'Préstamo' : 'Custodia'}</td>
                        <td>{formatDate(a.dueDate)}</td>
                        <td>{assignmentStatusLabels[a.status] ?? a.status}</td>
                        <td>
                          {a.documentUrl ? (
                            <a href={a.documentUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                              Ver
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {a.status === 'ACTIVE' && a.type === 'LOAN' ? (
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => openReturnModal(a)}
                            >
                              Devolver
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>{assignmentTotal === 0 ? 'Sin resultados' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, assignmentTotal)} de ${assignmentTotal}`}{assignmentsQuery.isFetching && !assignmentsQuery.isLoading ? ' · Actualizando...' : ''}</span>
              <div className={styles.paginationControls}>
                <label>Filas <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Anterior</button>
                <strong>{page} / {totalPages}</strong>
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Siguiente</button>
              </div>
            </div>
          </div>
        </section>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={`${styles.modal} ${styles['modal--wide']}`} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild>
                  <h2>Nueva transferencia</h2>
                </Dialog.Title>
                <p><strong>Custodia</strong> es permanente. <strong>Préstamo</strong> es temporal con devolución automática.</p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>
            <div className={styles.modalBody}>
            <form className={styles.stack} onSubmit={handleTransfer}>
              <div className={styles.formGrid}>

                {/* Activo */}
                <label className={styles.stack}>
                  <span>Activo</span>
                  <select
                    className="input"
                    value={form.assetId}
                    onChange={(e) => handleAssetChange(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un activo</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.code} — {asset.name} (×{asset.quantity})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Persona destino */}
                <label className={styles.stack}>
                  <span>Persona destino</span>
                  <select
                    className="input"
                    value={form.toPersonId}
                    onChange={(e) => setForm((f) => ({ ...f, toPersonId: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona una persona</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Tipo */}
                <label className={styles.stack}>
                  <span>Tipo</span>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'CUSTODY' | 'LOAN' }))}
                  >
                    <option value="CUSTODY">Custodia (permanente)</option>
                    <option value="LOAN">Préstamo (temporal)</option>
                  </select>
                </label>

                {/* Cantidad */}
                <label className={styles.stack}>
                  <span>
                    Cantidad
                    {distribution
                      ? ` — ${distribution.unassigned} libre(s) de ${distribution.totalQuantity}`
                      : ''}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={distribution ? distribution.totalQuantity : undefined}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </label>

                {/* Fecha de vencimiento */}
                {form.type === 'LOAN' && (
                  <label className={styles.stack}>
                    <span>Fecha de devolución</span>
                    <input
                      className="input"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                      required
                    />
                  </label>
                )}

                {/* Distribución actual + fuentes */}
                {distribution && distribution.assignments.length > 0 && (
                  <div className={`${styles.stack} ${styles.fieldFull}`}>
                    <span>Distribución actual — selecciona de dónde tomar unidades adicionales</span>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Persona</th>
                            <th>Unidades</th>
                            <th>Tipo</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {distribution.assignments.map((a) => {
                            const isSource = sources.some((s) => s.assignmentId === a.assignmentId);
                            const src = sources.find((s) => s.assignmentId === a.assignmentId);
                            return (
                              <tr key={a.assignmentId}>
                                <td>{a.personName}</td>
                                <td>{a.quantity}</td>
                                <td>{a.type === 'LOAN' ? 'Préstamo' : 'Custodia'}</td>
                                <td>
                                  {isSource ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <input
                                        className="input"
                                        type="number"
                                        min={1}
                                        max={a.quantity}
                                        value={src!.quantity}
                                        style={{ width: '5rem' }}
                                        onChange={(e) =>
                                          updateSourceQty(a.assignmentId, Number(e.target.value))
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="button button--ghost"
                                        onClick={() => removeSource(a.assignmentId)}
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="button button--ghost"
                                      onClick={() => addSource(a.assignmentId, a.personName, a.quantity)}
                                    >
                                      + Tomar de aquí
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen de disponibilidad */}
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      {overLimit ? (
                        <span style={{ color: 'var(--color-error, red)' }}>
                          ⚠ Insuficiente: {availableFromPool} libre(s) + {sourcesQty} de fuentes = {totalAvailable}. Necesitas {requestedQty}.
                        </span>
                      ) : needsMore ? (
                        <span style={{ color: 'var(--color-warning, orange)' }}>
                          ℹ {availableFromPool} del pool + {sourcesQty} de fuentes = {totalAvailable} disponibles para {requestedQty}.
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-success, green)' }}>
                          ✓ {availableFromPool} libre(s) — suficiente para {requestedQty}.
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Motivo */}
                <label className={`${styles.stack} ${styles.fieldFull}`}>
                  <span>Motivo</span>
                  <textarea
                    className="textarea"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Traslado de oficina, préstamo para evento..."
                  />
                </label>

                {/* Notas */}
                <label className={`${styles.stack} ${styles.fieldFull}`}>
                  <span>Notas</span>
                  <textarea
                    className="textarea"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Observaciones adicionales"
                  />
                </label>

                {/* Documento de respaldo */}
                <div className={`${styles.stack} ${styles.fieldFull}`}>
                  <span>Documento de respaldo (PDF o imagen, máx. 10 MB)</span>
                  <input
                    className="input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    disabled={uploadMutation.isPending}
                  />
                  {uploadMutation.isPending && <p style={{ fontSize: '0.85rem' }}>Subiendo archivo...</p>}
                  {uploadError && <p style={{ fontSize: '0.85rem', color: 'red' }}>{uploadError}</p>}
                  {uploadedDoc && (
                    <p style={{ fontSize: '0.85rem', color: 'green' }}>
                      ✓ Archivo subido —{' '}
                      <a href={uploadedDoc.url} target="_blank" rel="noopener noreferrer">
                        Ver documento
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {errorMessage && <p className={styles.fieldHint}>{errorMessage}</p>}

              <div className={styles.actionsRow}>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isSubmitting || overLimit || !form.assetId || !form.toPersonId}
                >
                  {isSubmitting ? 'Guardando...' : 'Crear transferencia'}
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

      <Dialog.Root open={Boolean(returnAssignment)} onOpenChange={(open) => { if (!open) closeReturnModal(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content className={styles.modal} aria-describedby={undefined}>
            <div className={styles.modalHeader}>
              <div>
                <Dialog.Title asChild>
                  <h2>Devolver préstamo</h2>
                </Dialog.Title>
                <p>
                  Define si las unidades vuelven al inventario libre o a la custodia anterior.
                </p>
              </div>
              <Dialog.Close asChild>
                <button className={styles.modalClose} type="button" aria-label="Cerrar">✕</button>
              </Dialog.Close>
            </div>

            <div className={styles.modalBody}>
              {returnAssignment && (
                <div className={styles.stack}>
                  <div className={styles.returnSummary}>
                    <span>Activo</span>
                    <strong>{returnAssignment.asset.code}</strong>
                    <p>{returnAssignment.asset.name} · {returnAssignment.quantity} unidad(es)</p>
                  </div>

                  <label className={styles.stack}>
                    <span>Fecha de devolución</span>
                    <input
                      className="input"
                      type="date"
                      value={returnDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                    />
                  </label>

                  <div className={styles.returnOptions}>
                    <button
                      type="button"
                      className={`${styles.returnOption} ${returnMode === 'FREE_POOL' ? styles['returnOption--selected'] : ''}`}
                      onClick={() => setReturnMode('FREE_POOL')}
                    >
                      <span>Inventario libre</span>
                      <strong>Dejar disponible para futuras transferencias</strong>
                      <small>La cantidad se libera del préstamo y queda sin responsable directo.</small>
                    </button>

                    <button
                      type="button"
                      className={`${styles.returnOption} ${returnMode === 'PREVIOUS_CUSTODY' ? styles['returnOption--selected'] : ''}`}
                      onClick={() => setReturnMode('PREVIOUS_CUSTODY')}
                      disabled={!returnAssignment.previousResponsiblePerson}
                    >
                      <span>Custodia anterior</span>
                      <strong>
                        {returnAssignment.previousResponsiblePerson
                          ? `Regresar a ${returnAssignment.previousResponsiblePerson.name}`
                          : 'No hay custodia previa registrada'}
                      </strong>
                      <small>Úsalo cuando el préstamo salió de una persona responsable específica.</small>
                    </button>
                  </div>

                  <label className={styles.stack}>
                    <span>Notas de devolución</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={returnNotes}
                      onChange={(event) => setReturnNotes(event.target.value)}
                      placeholder="Ej. Equipo recibido en buen estado."
                    />
                  </label>

                  <div className={styles.actionsRow}>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={handleReturn}
                      disabled={returnMutation.isPending}
                    >
                      {returnMutation.isPending ? 'Procesando...' : 'Confirmar devolución'}
                    </button>
                    <button className="button button--ghost" type="button" onClick={closeReturnModal} disabled={returnMutation.isPending}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
