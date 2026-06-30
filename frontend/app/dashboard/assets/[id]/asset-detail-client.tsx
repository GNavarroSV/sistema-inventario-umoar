'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import {
  useAssetQuery,
  useAssetStockMovementsQuery,
  useCreateAssetStockMovementMutation,
  useDiscardAssetMutation,
  type AssetAssignmentDto,
} from '../../../../hooks/assets/assets';
import adminStyles from '../../admin.module.css';
import styles from '../assets.module.css';
import { useCostCentersQuery } from '../../../../hooks/cost-centers/use-cost-centers';

function formatDate(value?: string | Date | null, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-SV', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(value);
}

function valueOrDash(value?: string | number | null) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function formatAssignmentType(value?: string | null) {
  if (value === 'LOAN') return 'Préstamo';
  if (value === 'CUSTODY') return 'Custodia';
  return valueOrDash(value);
}

function formatAssignmentStatus(value?: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Activo',
    RETURNED: 'Devuelto',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
  };
  return value ? labels[value] ?? value : '—';
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

type MovementType = 'IN' | 'OUT';

export default function AssetDetailClient() {
  const params = useParams<{ id: string }>();
  const assetId = Number(params.id);
  const assetQuery = useAssetQuery(assetId);
  const movementsQuery = useAssetStockMovementsQuery(assetId);
  const costCentersQuery = useCostCentersQuery(true);
  const movementMutation = useCreateAssetStockMovementMutation();
  const discardMutation = useDiscardAssetMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [disposalDate, setDisposalDate] = useState(todayInputValue);
  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('1');
  const [freeQuantity, setFreeQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceQuantities, setSourceQuantities] = useState<Record<number, string>>({});

  const asset = assetQuery.data;
  const costCenterName = asset?.costCenter?.name ?? costCentersQuery.data?.find(
    (costCenter) => costCenter.id === asset?.costCenterId,
  )?.name;
  const activeAssignments = useMemo(
    () => (asset?.assignments ?? []).filter((assignment) => assignment.status === 'ACTIVE'),
    [asset?.assignments],
  );
  const assignedQuantity = activeAssignments.reduce((sum, item) => sum + item.quantity, 0);
  const availableFreeQuantity = Math.max(0, (asset?.quantity ?? 0) - assignedQuantity);
  const requestedQuantity = Number(quantity) || 0;
  const requestedFreeQuantity = Number(freeQuantity) || 0;
  const requestedSourceQuantity = Object.values(sourceQuantities).reduce(
    (sum, value) => sum + (Number(value) || 0), 0,
  );
  const selectedQuantity = requestedFreeQuantity + requestedSourceQuantity;

  const reset = (nextType: MovementType = 'IN') => {
    setType(nextType);
    setQuantity('1');
    setFreeQuantity(nextType === 'OUT' ? String(Math.min(1, availableFreeQuantity)) : '1');
    setReason('');
    setNotes('');
    setSourceQuantities({});
  };

  const openMovement = (nextType: MovementType) => {
    reset(nextType);
    setIsOpen(true);
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    if (type === 'OUT') {
      setFreeQuantity(String(Math.min(Number(value) || 0, availableFreeQuantity)));
      setSourceQuantities({});
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sources = Object.entries(sourceQuantities)
      .map(([assignmentId, value]) => ({ assignmentId: Number(assignmentId), quantity: Number(value) || 0 }))
      .filter((source) => source.quantity > 0);

    await movementMutation.mutateAsync({
      id: assetId,
      data: {
        type,
        quantity: requestedQuantity,
        freeQuantity: type === 'OUT' ? requestedFreeQuantity : undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        sources: type === 'OUT' && sources.length ? sources : undefined,
      },
    });
    setIsOpen(false);
    reset();
  };

  const handleDiscard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await discardMutation.mutateAsync({ id: assetId, disposalDate });
    setIsDiscardOpen(false);
  };

  if (assetQuery.isLoading) return <p>Cargando activo...</p>;
  if (assetQuery.isError || !asset) return <p>No se pudo cargar el activo.</p>;

  const invalidExit = type === 'OUT' && (
    selectedQuantity !== requestedQuantity ||
    requestedFreeQuantity > availableFreeQuantity ||
    requestedQuantity > asset.quantity
  );

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Activos</p>
          <h1>{asset.name}</h1>
          <p className={styles.leadText}>Detalle, distribución y movimientos del activo.</p>
        </div>
        <div className={styles.actions}>
          {asset.status !== 'DESCARTADO' && <>
            <button className="button button--primary" type="button" onClick={() => openMovement('IN')}>Registrar entrada</button>
            <button className="button button--ghost" type="button" onClick={() => openMovement('OUT')}>Registrar salida</button>
            <Link href={`/dashboard/assets/${assetId}/edit`} className="button button--ghost">Editar</Link>
            <button className="button button--danger" type="button" onClick={() => { setDisposalDate(todayInputValue()); setIsDiscardOpen(true); }}>Descartar activo</button>
          </>}
          <Link href="/dashboard/assets" className="button button--ghost">Volver</Link>
        </div>
      </div>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span className={styles.summaryLabel}>Código</span><strong>{asset.code}</strong></article>
        <article className={styles.summaryCard}><span className={styles.summaryLabel}>Estado</span><strong>{asset.status}</strong></article>
        <article className={styles.summaryCard}><span className={styles.summaryLabel}>Stock total</span><strong>{asset.quantity}</strong></article>
        <article className={styles.summaryCard}><span className={styles.summaryLabel}>Stock libre</span><strong>{availableFreeQuantity}</strong></article>
        <article className={styles.summaryCard}><span className={styles.summaryLabel}>Asignado</span><strong>{assignedQuantity}</strong></article>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Información general</h2>
        <dl className={styles.detailsGrid}>
          <div><dt>Categoría</dt><dd>{valueOrDash((asset as any).category?.name ?? (asset as any).categoryId)}</dd></div>
          <div><dt>Ubicación</dt><dd>{asset.location}</dd></div>
          <div><dt>Descripción</dt><dd>{valueOrDash((asset as any).description)}</dd></div>
          <div><dt>Centro de costo</dt><dd>{valueOrDash(costCenterName)}</dd></div>
          <div><dt>Proveedor</dt><dd>{valueOrDash((asset as any).supplier?.name ?? (asset as any).supplierId)}</dd></div>
          <div><dt>Serie</dt><dd>{valueOrDash((asset as any).serialNumber)}</dd></div>
        </dl>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Información financiera</h2>
        <dl className={styles.detailsGrid}>
          <div><dt>Fecha de adquisición o compra</dt><dd>{formatDate(asset.acquisitionDate)}</dd></div>
          <div><dt>Valor unitario</dt><dd>{formatCurrency(asset.unitValue)}</dd></div>
          <div><dt>Garantía hasta</dt><dd>{formatDate((asset as any).warrantyEndDate)}</dd></div>
          <div><dt>Meses de garantía</dt><dd>{valueOrDash((asset as any).warrantyMonths)}</dd></div>
        </dl>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Asignaciones y custodia</h2>
        {asset.assignments?.length ? (
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>Tipo</th><th>Asignado a</th><th>Cant.</th><th>Inicio</th><th>Vence</th><th>Estado</th><th>Doc.</th></tr></thead>
            <tbody>{asset.assignments.map((assignment) => <tr key={assignment.id}>
              <td>{formatAssignmentType(assignment.type)}</td><td>{assignment.assignedToPerson.name}</td><td>{assignment.quantity}</td>
              <td>{formatDate(assignment.startDate)}</td><td>{formatDate(assignment.dueDate)}</td><td>{formatAssignmentStatus(assignment.status)}</td>
              <td>{assignment.documentUrl ? <a href={assignment.documentUrl} target="_blank" rel="noopener noreferrer">Ver</a> : '—'}</td>
            </tr>)}</tbody>
          </table></div>
        ) : <p className={styles.emptyState}>No hay asignaciones registradas.</p>}
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Movimientos de inventario</h2>
        {movementsQuery.isLoading ? <p>Cargando movimientos...</p> : movementsQuery.data?.length ? (
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Cambio</th><th>Origen</th><th>Motivo</th><th>Registró</th></tr></thead>
            <tbody>{movementsQuery.data.map((movement) => <tr key={movement.id}>
              <td>{formatDate(movement.createdAt, true)}</td>
              <td><span className={`${styles.movementBadge} ${movement.type === 'IN' ? styles.movementIn : styles.movementOut}`}>{movement.type === 'IN' ? 'Entrada' : 'Salida'}</span></td>
              <td>{movement.type === 'IN' ? '+' : '−'}{movement.quantity}</td><td>{movement.previousQuantity} → {movement.newQuantity}</td>
              <td>{movement.type === 'IN' ? 'Inventario libre' : <div className={styles.movementSources}>
                {movement.freeQuantity > 0 && <span>Inventario libre: {movement.freeQuantity}</span>}
                {movement.sourceBreakdown?.map((source) => <span key={`${movement.id}-${source.assignmentId}`}>{source.personName}: {source.quantity}</span>)}
              </div>}</td>
              <td>{movement.reason}</td><td>{movement.performedByUser?.name ?? 'Sistema'}</td>
            </tr>)}</tbody>
          </table></div>
        ) : <p className={styles.emptyState}>No hay entradas o salidas registradas.</p>}
      </section>

      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className={adminStyles.modalOverlay} />
          <Dialog.Content className={`${adminStyles.modal} ${adminStyles['modal--wide']}`} aria-describedby={undefined}>
            <div className={adminStyles.modalHeader}>
              <div><Dialog.Title asChild><h2>{type === 'IN' ? 'Registrar entrada' : 'Registrar salida'}</h2></Dialog.Title><p>{asset.code} — {asset.name}</p></div>
              <Dialog.Close asChild><button className={adminStyles.modalClose} type="button" aria-label="Cerrar">✕</button></Dialog.Close>
            </div>
            <div className={adminStyles.modalBody}>
              <form className={adminStyles.stack} onSubmit={handleSubmit}>
                <div className={styles.movementSummary}><span>Total: <strong>{asset.quantity}</strong></span><span>Libre: <strong>{availableFreeQuantity}</strong></span><span>Asignado: <strong>{assignedQuantity}</strong></span></div>
                <div className={adminStyles.formGrid}>
                  <label className={adminStyles.stack}><span>Cantidad</span><input className="input" type="number" min="1" max={type === 'OUT' ? asset.quantity : undefined} value={quantity} onChange={(event) => handleQuantityChange(event.target.value)} required /></label>
                  {type === 'OUT' && <label className={adminStyles.stack}><span>Tomar del stock libre</span><input className="input" type="number" min="0" max={Math.min(requestedQuantity, availableFreeQuantity)} value={freeQuantity} onChange={(event) => setFreeQuantity(event.target.value)} required /></label>}
                  <label className={`${adminStyles.stack} ${adminStyles.fieldFull}`}><span>Motivo</span><input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Compra, reposición, baja, pérdida, daño..." required /></label>
                </div>

                {type === 'OUT' && activeAssignments.length > 0 && <div className={styles.sourceSelector}>
                  <div><strong>Unidades asignadas que se retirarán</strong><p>Indica cuántas unidades se descontarán de cada persona.</p></div>
                  {activeAssignments.map((assignment: AssetAssignmentDto) => <label key={assignment.id} className={styles.sourceRow}>
                    <span><strong>{assignment.assignedToPerson.name}</strong><small>{formatAssignmentType(assignment.type)} · {assignment.quantity} disponibles</small></span>
                    <input className="input" type="number" min="0" max={assignment.quantity} value={sourceQuantities[assignment.id] ?? '0'} onChange={(event) => setSourceQuantities((current) => ({ ...current, [assignment.id]: event.target.value }))} />
                  </label>)}
                  <div className={`${styles.selectionStatus} ${selectedQuantity === requestedQuantity ? styles.selectionComplete : ''}`}>Seleccionado: {selectedQuantity} de {requestedQuantity}{selectedQuantity < requestedQuantity ? ` · Faltan ${requestedQuantity - selectedQuantity}` : selectedQuantity > requestedQuantity ? ` · Sobran ${selectedQuantity - requestedQuantity}` : ' · Completo'}</div>
                </div>}

                <label className={adminStyles.stack}><span>Observaciones</span><textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Información adicional de la operación" /></label>
                {movementMutation.error instanceof Error && <p className={styles.errorBox}>{movementMutation.error.message}</p>}
                <div className={adminStyles.actionsRow}>
                  <button className="button button--primary" type="submit" disabled={movementMutation.isPending || requestedQuantity < 1 || invalidExit}>{movementMutation.isPending ? 'Guardando...' : type === 'IN' ? 'Registrar entrada' : 'Registrar salida'}</button>
                  <button className="button button--ghost" type="button" onClick={() => setIsOpen(false)} disabled={movementMutation.isPending}>Cancelar</button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isDiscardOpen} onOpenChange={(open) => !open && setIsDiscardOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className={adminStyles.modalOverlay} />
          <Dialog.Content className={adminStyles.modal} aria-describedby={undefined}>
            <div className={adminStyles.modalHeader}>
              <div>
                <Dialog.Title asChild><h2>Descartar activo</h2></Dialog.Title>
                <p>{asset.code} — {asset.name}</p>
              </div>
              <Dialog.Close asChild><button className={adminStyles.modalClose} type="button" aria-label="Cerrar">✕</button></Dialog.Close>
            </div>
            <div className={adminStyles.modalBody}>
              <form className={adminStyles.stack} onSubmit={handleDiscard}>
                <div className={styles.discardWarning}>
                  <strong>Esta acción no se puede deshacer.</strong>
                  <p>Se descartarán las <strong>{asset.quantity} unidades</strong> registradas. Las asignaciones y custodias activas serán canceladas y el stock total quedará en cero.</p>
                </div>
                <label className={adminStyles.stack}>
                  <span>Fecha de descarte</span>
                  <input className="input" type="date" value={disposalDate} max={todayInputValue()} onChange={(event) => setDisposalDate(event.target.value)} required />
                  <small>Puede seleccionar hoy o una fecha anterior.</small>
                </label>
                {discardMutation.error instanceof Error && <p className={styles.errorBox}>{discardMutation.error.message}</p>}
                <div className={adminStyles.actionsRow}>
                  <button className="button button--danger" type="submit" disabled={discardMutation.isPending || !disposalDate}>{discardMutation.isPending ? 'Descartando...' : `Descartar ${asset.quantity} unidades`}</button>
                  <button className="button button--ghost" type="button" onClick={() => setIsDiscardOpen(false)} disabled={discardMutation.isPending}>Cancelar</button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
