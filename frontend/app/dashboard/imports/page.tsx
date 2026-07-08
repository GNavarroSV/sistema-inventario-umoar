'use client';

import Link from 'next/link';
import { useState } from 'react';
import { API_BASE_URL, apiRequest } from '../../../config/api';
import { useAuthContext } from '../../../contexts/auth-context';
import styles from './imports.module.css';

const initialTemplateHref = '/templates/activos-carga-inicial.csv';

export default function ImportsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className="eyebrow">Carga masiva</p>
          <h1>Importación de activos</h1>
          <p className={styles.lead}>
            Registra activos nuevos o descarga una plantilla con el inventario actual para aplicar aumentos y disminuciones de stock.
          </p>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <p className="eyebrow">Plantilla 1</p>
            <h2>Alta inicial de activos</h2>
            <p>Sirve para registrar activos nuevos con código autogenerado y cantidad inicial.</p>
          </div>

          <div className={styles.columns}>
            <div className={styles.sampleBox}>
              <strong>Campos mínimos</strong>
              <ul className={styles.list}>
                <li>nombre</li>
                <li>cantidad</li>
                <li>categoría</li>
                <li>responsable</li>
                <li>ubicación</li>
                <li>valor_unitario</li>
              </ul>
            </div>

            <div className={styles.sampleBox}>
              <strong>Campos opcionales</strong>
              <ul className={styles.list}>
                <li>serie</li>
                <li>fabricante</li>
                <li>modelo</li>
                <li>centro_de_costo</li>
                <li>fecha_adquisición_o_compra</li>
              </ul>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href={initialTemplateHref} className="button button--primary" download>
              Descargar plantilla ejemplo
            </Link>
            <Link href={initialTemplateHref} className="button button--ghost" download>
              Descargar copia base
            </Link>
          </div>
          <div style={{ marginTop: 12 }}>
            <ImportUploader mode="initial" />
          </div>
          <p className={styles.downloadNote}>La primera fila del archivo contiene encabezados listos para copiar en Excel o CSV.</p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <p className="eyebrow">Plantilla 2</p>
            <h2>Conteo y movimientos de stock</h2>
            <p>Se genera con los activos registrados. Completa únicamente los activos cuyo stock debe aumentar o disminuir.</p>
          </div>

          <div className={styles.columns}>
            <div className={styles.sampleBox}>
              <strong>Datos incluidos</strong>
              <ul className={styles.list}>
                <li>código</li>
                <li>nombre</li>
                <li>stock_actual</li>
              </ul>
            </div>

            <div className={styles.sampleBox}>
              <strong>Campos por completar</strong>
              <ul className={styles.list}>
                <li>aumento_disminución</li>
                <li>motivo</li>
                <li>notas</li>
              </ul>
            </div>
          </div>

          <div className={styles.actions}>
            <StockTemplateDownload />
          </div>
          <div style={{ marginTop: 12 }}>
            <ImportUploader mode="stock" />
          </div>
          <p className={styles.downloadNote}>Usa números positivos para aumentar y negativos para disminuir. Las filas sin ajuste se ignoran.</p>
        </article>
      </section>
    </main>
  );
}

function StockTemplateDownload() {
  const [loading, setLoading] = useState(false);
  const { session } = useAuthContext();

  async function download() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/imports/assets/stock/template`, {
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined,
      });
      if (!response.ok) throw new Error('No se pudo generar la plantilla');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'movimientos-stock.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return <button type="button" className="button button--primary" onClick={download} disabled={loading}>{loading ? 'Generando...' : 'Descargar inventario actual'}</button>;
}

function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString('es-SV');
}

function ImportResultSummary({ result }: { result: any }) {
  if (result.error) {
    return (
      <div className={`${styles.resultBox} ${styles['resultBox--error']}`}>
        <strong>No se pudo procesar el archivo</strong>
        <p>{result.error}</p>
      </div>
    );
  }

  const previewItems = [
    ['Lote', result.batchId],
    ['Filas procesadas', result.total],
    ['Válidas', result.valid],
    ['Por crear', result.created],
    ['Por actualizar', result.updated],
    ['Omitidas', result.skipped],
    ['Con errores', result.errors],
  ].filter(([, value]) => value !== undefined);

  const executionItems = result.execute
    ? [
        ['Creadas', result.execute.created],
        ['Actualizadas', result.execute.updated],
        ['Fallidas', result.execute.failed],
        ['Omitidas', result.execute.skipped],
      ].filter(([, value]) => value !== undefined)
    : [];

  return (
    <div className={styles.resultBox}>
      <div className={styles.resultHeader}>
        <strong>Resultado de previsualización</strong>
        <span>{Number(result.errors ?? 0) > 0 ? 'Requiere corrección' : 'Archivo válido'}</span>
      </div>
      <div className={styles.resultGrid}>
        {previewItems.map(([label, value]) => (
          <div className={styles.resultItem} key={label}>
            <span>{label}</span>
            <strong>{formatNumber(value)}</strong>
          </div>
        ))}
      </div>

      {result.execute && (
        <>
          <div className={styles.resultHeader}>
            <strong>Resultado de ejecución</strong>
            <span>{Number(result.execute.failed ?? 0) > 0 ? 'Con observaciones' : 'Completado'}</span>
          </div>
          <div className={styles.resultGrid}>
            {executionItems.map(([label, value]) => (
              <div className={styles.resultItem} key={label}>
                <span>{label}</span>
                <strong>{formatNumber(value)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ImportUploader({ mode }: { mode: 'initial' | 'stock' }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { session } = useAuthContext();

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (mode === 'initial') fd.append('strategy', 'INSERT_ONLY');

      const endpoint = mode === 'stock' ? '/imports/assets/stock/dry-run' : '/imports/assets/dry-run';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined,
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Error en previsualización');
      }

      const payload = await res.json();
      setResult(payload);
    } catch (err: any) {
      setResult({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    if (!result?.batchId) return;
    setLoading(true);
    try {
      const payload = await apiRequest<any>(`/imports/assets/execute/${result.batchId}`, { method: 'POST', token: session?.accessToken });
      setResult((r: any) => ({ ...r, execute: payload }));
    } catch (err: any) {
      setResult({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  const executableRows = Number(result?.valid ?? 0) + Number(result?.created ?? 0) + Number(result?.updated ?? 0);
  const canExecute = Boolean(result?.batchId) && Number(result?.errors ?? 0) === 0 && executableRows > 0 && !result?.execute;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="button button--primary" onClick={handleUpload} disabled={loading || !file}>
          {loading ? 'Procesando...' : 'Previsualizar'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 12 }}>
          <ImportResultSummary result={result} />
          {canExecute && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="button button--primary" onClick={handleExecute} disabled={loading}>
                Ejecutar importación
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
