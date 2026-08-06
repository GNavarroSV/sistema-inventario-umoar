'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type ReportType = 'ASSETS' | 'MOVEMENTS' | 'CUSTODY' | 'INVENTORY_STATUS' | 'RESPONSIBILITY';
export type ReportFormat = 'PDF' | 'XLSX';
export type ReportFilters = { from: string; to: string; assetId?: number };
export type ReportDashboard = {
  summary: { assets: number; units: number; inventoryValue: number; activeAssignments: number; entries: number; exits: number };
  byStatus: { label: string; value: number }[];
  byCategory: { label: string; quantity: number; value: number }[];
  movementTimeline: { date: string; in: number; out: number }[];
  byResponsible: { label: string; value: number }[];
};

const REPORT_FILE_NAMES: Record<ReportType, string> = {
  ASSETS: 'inventario-completo-activos',
  MOVEMENTS: 'movimientos-activos',
  CUSTODY: 'custodias-prestamos-por-activo',
  INVENTORY_STATUS: 'inventario-por-estado-categoria',
  RESPONSIBILITY: 'inventario-por-responsable',
};

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}

export function useReportDashboardQuery(filters: ReportFilters) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: ['reports', 'dashboard', filters],
    queryFn: () => apiRequest<ReportDashboard>(`/reports/dashboard?${queryString(filters)}`, { token: auth.session?.accessToken }),
    enabled: auth.isAuthenticated && Boolean(filters.from && filters.to),
  });
}

export async function downloadReport(token: string, type: ReportType, format: ReportFormat, filters: ReportFilters) {
  const query = queryString({ type, format, ...filters });
  const response = await fetch(`${API_BASE_URL}/reports/export?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? 'No se pudo generar el reporte');
  }
  const blob = await response.blob();
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const fileName = `${REPORT_FILE_NAMES[type]}-${localToday}.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click();
  URL.revokeObjectURL(url);
}
