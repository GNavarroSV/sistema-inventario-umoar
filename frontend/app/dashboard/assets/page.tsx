'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useAssetsQuery, type AssetListParams } from '../../../hooks/assets/assets';
import styles from './assets.module.css';

const emptyFilters = { code: '', name: '', quantity: '', responsible: '', status: '', location: '', unitValue: '' };
const statusLabels: Record<string, string> = {
  OPERATIVO: 'Operativo', OBSOLETO: 'Obsoleto', MAL_ESTADO: 'Mal estado', DESUSO: 'En desuso', REPARACION: 'En reparación', DESCARTADO: 'Descartado',
};

export default function AssetsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState(emptyFilters);
  const deferredFilters = useDeferredValue(filters);
  const params: AssetListParams = { skip: (page - 1) * pageSize, take: pageSize, ...deferredFilters };
  const { data, isLoading, isError, isFetching } = useAssetsQuery(params);
  const assets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const changeFilter = (field: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  return (
    <section className={styles.assetsPage}>
      <div className={styles.pageHeader}>
        <div><p className="eyebrow">Activos</p><h1>Listado de activos</h1><p className={styles.leadText}>Filtra cada columna y consulta el inventario por páginas.</p></div>
        <Link href="/dashboard/assets/new" className="button button--primary">Nuevo activo</Link>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Cantidad</th><th>Responsable</th><th>Estado</th><th>Ubicación</th><th>Valor unitario</th><th></th></tr>
              <tr className={styles.filterRow}>
                <th><input aria-label="Filtrar por código" value={filters.code} onChange={(e) => changeFilter('code', e.target.value)} placeholder="Buscar..." /></th>
                <th><input aria-label="Filtrar por nombre" value={filters.name} onChange={(e) => changeFilter('name', e.target.value)} placeholder="Buscar..." /></th>
                <th><input aria-label="Filtrar por cantidad" type="number" min="0" value={filters.quantity} onChange={(e) => changeFilter('quantity', e.target.value)} placeholder="Exacta" /></th>
                <th><input aria-label="Filtrar por responsable" value={filters.responsible} onChange={(e) => changeFilter('responsible', e.target.value)} placeholder="Buscar..." /></th>
                <th><select aria-label="Filtrar por estado" value={filters.status} onChange={(e) => changeFilter('status', e.target.value)}><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></th>
                <th><input aria-label="Filtrar por ubicación" value={filters.location} onChange={(e) => changeFilter('location', e.target.value)} placeholder="Buscar..." /></th>
                <th><input aria-label="Filtrar por valor unitario" type="number" min="0" step="0.01" value={filters.unitValue} onChange={(e) => changeFilter('unitValue', e.target.value)} placeholder="Exacto" /></th>
                <th><button type="button" className={styles.clearFilters} onClick={() => { setFilters(emptyFilters); setPage(1); }}>Limpiar</button></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8}>Cargando activos...</td></tr>
                : isError ? <tr><td colSpan={8}>No se pudieron cargar los activos.</td></tr>
                  : assets.length === 0 ? <tr><td colSpan={8}>No hay activos que coincidan con los filtros.</td></tr>
                    : assets.map((asset) => <tr key={asset.id}>
                      <td>{asset.code}</td><td>{asset.name}</td><td>{asset.quantity}</td><td>{asset.responsiblePerson?.name ?? '—'}</td>
                      <td>{statusLabels[asset.status] ?? asset.status}</td><td>{asset.location}</td>
                      <td>{new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(asset.unitValue)}</td>
                      <td><Link className={styles.link} href={`/dashboard/assets/${asset.id}`}>Ver</Link></td>
                    </tr>)}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>{total === 0 ? 'Sin resultados' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}{isFetching && !isLoading ? ' · Actualizando...' : ''}</span>
          <div className={styles.paginationControls}>
            <label>Filas <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Anterior</button>
            <strong>{page} / {totalPages}</strong>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Siguiente</button>
          </div>
        </div>
      </div>
    </section>
  );
}
