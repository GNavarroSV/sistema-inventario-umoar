'use client';

import { useState } from 'react';
import { useAssetsQuery } from '../../../hooks/assets/assets';
import { useAuthContext } from '../../../contexts/auth-context';
import { downloadReport, useReportDashboardQuery, type ReportFormat, type ReportType } from '../../../hooks/reports/use-reports';
import styles from './reports.module.css';

const REPORTS: Record<ReportType, { label: string; description: string; asset: boolean }> = {
  ASSETS: { label: 'Inventario completo de activos', description: 'Ficha básica, cantidades, valor unitario y valor total del inventario.', asset: false },
  MOVEMENTS: { label: 'Movimientos de activos', description: 'Entradas y salidas efectuadas dentro del período seleccionado.', asset: true },
  CUSTODY: { label: 'Custodias y préstamos por activo', description: 'Personas responsables, cantidades, fechas y estado de las asignaciones.', asset: true },
  INVENTORY_STATUS: { label: 'Inventario por estado y categoría', description: 'Resumen gerencial de unidades y valor agrupado.', asset: false },
  RESPONSIBILITY: { label: 'Inventario por responsable', description: 'Existencias actualmente asignadas y su valor económico.', asset: true },
};

function localDate(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); }
function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <div className={styles.bars}>{data.length ? data.map((item) => <div key={item.label}><div className={styles.barLabel}><span>{item.label}</span><strong>{item.value}</strong></div><div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${(item.value / max) * 100}%` }} /></div></div>) : <p>Sin información para el período.</p>}</div>;
}

export default function ReportsPage() {
  const now = new Date();
  const [from, setFrom] = useState(localDate(new Date(now.getFullYear(), 0, 1)));
  const [to, setTo] = useState(localDate(now));
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState<ReportType>('ASSETS');
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const auth = useAuthContext();
  const assetsQuery = useAssetsQuery({ take: 500 });
  const filters = { from, to, assetId: assetId ? Number(assetId) : undefined };
  const dashboardQuery = useReportDashboardQuery(filters);
  const dashboard = dashboardQuery.data;
  const assets = assetsQuery.data?.data ?? [];
  const timelineMax = Math.max(1, ...(dashboard?.movementTimeline.flatMap((item) => [item.in, item.out]) ?? [1]));

  const generate = async () => {
    if (!auth.session?.accessToken) return;
    setExporting(true); setExportError(null);
    try { await downloadReport(auth.session.accessToken, type, format, { from, to, assetId: REPORTS[type].asset && assetId ? Number(assetId) : undefined }); }
    catch (error) { setExportError(error instanceof Error ? error.message : 'No se pudo generar el reporte'); }
    finally { setExporting(false); }
  };

  return <main className={styles.page}>
    <header className={styles.header}><div><p className="eyebrow">Información gerencial</p><h1>Reportes e indicadores</h1><p className={styles.lead}>Analiza el inventario por período y descarga información institucional.</p></div></header>
    <section className={styles.filters}>
      <div className={styles.filterGrid}>
        <label className={styles.field}>Desde<input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className={styles.field}>Hasta<input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <label className={styles.field}>Tipo de reporte<select className="input" value={type} onChange={(e) => { const next = e.target.value as ReportType; setType(next); if (!REPORTS[next].asset) setAssetId(''); }}>{Object.entries(REPORTS).map(([value, report]) => <option key={value} value={value}>{report.label}</option>)}</select></label>
        <label className={styles.field}>Activo {REPORTS[type].asset ? '(opcional)' : ''}<select className="input" value={assetId} disabled={!REPORTS[type].asset} onChange={(e) => setAssetId(e.target.value)}><option value="">Todos los activos</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</select></label>
        <label className={styles.field}>Formato<select className="input" value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}><option value="PDF">PDF</option><option value="XLSX">Excel (.xlsx)</option></select></label>
      </div>
      <p className={styles.reportInfo}>{REPORTS[type].description}</p>
      <button className="button button--primary" type="button" onClick={generate} disabled={exporting || !from || !to}>{exporting ? 'Generando...' : `Generar ${format === 'PDF' ? 'PDF' : 'Excel'}`}</button>
      {exportError && <p className={styles.error}>{exportError}</p>}
    </section>

    {dashboardQuery.isLoading ? <section className={styles.card}>Calculando indicadores...</section> : dashboard && <>
      <section className={styles.summary}>
        <article className={styles.metric}><span>Activos registrados</span><strong>{dashboard.summary.assets}</strong></article>
        <article className={styles.metric}><span>Unidades actuales</span><strong>{dashboard.summary.units}</strong></article>
        <article className={styles.metric}><span>Valor del inventario</span><strong>{new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(dashboard.summary.inventoryValue)}</strong></article>
        <article className={styles.metric}><span>Unidades asignadas</span><strong>{dashboard.summary.activeAssignments}</strong></article>
        <article className={styles.metric}><span>Entradas del período</span><strong>+{dashboard.summary.entries}</strong></article>
        <article className={styles.metric}><span>Salidas del período</span><strong>−{dashboard.summary.exits}</strong></article>
      </section>
      <section className={styles.charts}>
        <article className={styles.card}><h2>Unidades por estado</h2><Bars data={dashboard.byStatus} /></article>
        <article className={styles.card}><h2>Unidades por responsable</h2><Bars data={dashboard.byResponsible} /></article>
        <article className={styles.card}><h2>Categorías con mayor existencia</h2><Bars data={dashboard.byCategory.map((item) => ({ label: item.label, value: item.quantity }))} /></article>
        <article className={styles.card}><h2>Movimientos por fecha</h2><div className={styles.timeline}>{dashboard.movementTimeline.length ? dashboard.movementTimeline.map((item) => <div className={styles.timelineItem} key={item.date}><div className={styles.columns}><div title={`Entradas: ${item.in}`} className={styles.columnIn} style={{ height: `${(item.in / timelineMax) * 100}%` }} /><div title={`Salidas: ${item.out}`} className={styles.columnOut} style={{ height: `${(item.out / timelineMax) * 100}%` }} /></div><span>{item.date.slice(5)}</span></div>) : <p>Sin movimientos en el período.</p>}</div></article>
      </section>
    </>}
  </main>;
}
