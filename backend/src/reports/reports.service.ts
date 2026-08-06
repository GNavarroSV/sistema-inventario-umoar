import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';

export type ReportType = 'ASSETS' | 'MOVEMENTS' | 'CUSTODY' | 'INVENTORY_STATUS' | 'RESPONSIBILITY';
export type ReportFormat = 'XLSX' | 'PDF';
type Filters = { from?: string; to?: string; assetId?: number };
type ExportFilters = Filters & { type: ReportType; format: ReportFormat };
type ReportData = { title: string; subtitle: string; headers: string[]; rows: Array<Array<string | number>> };

const STATUS_LABELS: Record<string, string> = {
  OPERATIVO: 'Operativo', OBSOLETO: 'Obsoleto', MAL_ESTADO: 'Mal estado', DESUSO: 'En desuso', REPARACION: 'En reparación', DESCARTADO: 'Descartado',
};
const ASSIGNMENT_LABELS: Record<string, string> = { ACTIVE: 'Activo', RETURNED: 'Devuelto', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' };
const REPORT_FILE_NAMES: Record<ReportType, string> = {
  ASSETS: 'inventario-completo-activos',
  MOVEMENTS: 'movimientos-activos',
  CUSTODY: 'custodias-prestamos-por-activo',
  INVENTORY_STATUS: 'inventario-por-estado-categoria',
  RESPONSIBILITY: 'inventario-por-responsable',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dates(filters: Filters) {
    const from = filters.from ? new Date(`${filters.from}T00:00:00.000`) : new Date(new Date().getFullYear(), 0, 1);
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new BadRequestException('Rango de fechas inválido');
    return { from, to };
  }

  async dashboard(filters: Filters) {
    const { from, to } = this.dates(filters);
    const assetFilter = filters.assetId ? { assetId: filters.assetId } : {};
    const [assets, movements, activeAssignments] = await Promise.all([
      this.prisma.asset.findMany({
        where: filters.assetId ? { id: filters.assetId } : undefined,
        include: { category: true },
      }),
      this.prisma.assetStockMovement.findMany({ where: { ...assetFilter, createdAt: { gte: from, lte: to } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.assetAssignment.findMany({
        where: { ...assetFilter, status: AssignmentStatus.ACTIVE },
        include: { assignedToPerson: true, asset: { select: { unitValue: true } } },
      }),
    ]);

    const statusMap = new Map<string, number>();
    const categoryMap = new Map<string, { quantity: number; value: number }>();
    assets.forEach((asset: any) => {
      statusMap.set(STATUS_LABELS[asset.status] ?? asset.status, (statusMap.get(STATUS_LABELS[asset.status] ?? asset.status) ?? 0) + asset.quantity);
      const current = categoryMap.get(asset.category.name) ?? { quantity: 0, value: 0 };
      current.quantity += asset.quantity;
      current.value += asset.quantity * asset.unitValue;
      categoryMap.set(asset.category.name, current);
    });
    const timeline = new Map<string, { in: number; out: number }>();
    movements.forEach((movement: any) => {
      const key = movement.createdAt.toISOString().slice(0, 10);
      const current = timeline.get(key) ?? { in: 0, out: 0 };
      current[movement.type === 'IN' ? 'in' : 'out'] += movement.quantity;
      timeline.set(key, current);
    });
    const peopleMap = new Map<string, number>();
    activeAssignments.forEach((assignment: any) => peopleMap.set(assignment.assignedToPerson.name, (peopleMap.get(assignment.assignedToPerson.name) ?? 0) + assignment.quantity));

    return {
      summary: {
        assets: assets.length,
        units: assets.reduce((sum: number, asset: any) => sum + asset.quantity, 0),
        inventoryValue: assets.reduce((sum: number, asset: any) => sum + asset.quantity * asset.unitValue, 0),
        activeAssignments: activeAssignments.reduce((sum: number, assignment: any) => sum + assignment.quantity, 0),
        entries: movements.filter((movement: any) => movement.type === 'IN').reduce((sum: number, movement: any) => sum + movement.quantity, 0),
        exits: movements.filter((movement: any) => movement.type === 'OUT').reduce((sum: number, movement: any) => sum + movement.quantity, 0),
      },
      byStatus: [...statusMap].map(([label, value]) => ({ label, value })),
      byCategory: [...categoryMap].map(([label, value]) => ({ label, ...value })).sort((a, b) => b.quantity - a.quantity),
      movementTimeline: [...timeline].map(([date, value]) => ({ date, ...value })),
      byResponsible: [...peopleMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    };
  }

  async export(filters: ExportFilters) {
    if (!['ASSETS', 'MOVEMENTS', 'CUSTODY', 'INVENTORY_STATUS', 'RESPONSIBILITY'].includes(filters.type)) throw new BadRequestException('Tipo de reporte inválido');
    if (!['XLSX', 'PDF'].includes(filters.format)) throw new BadRequestException('Formato inválido');
    const report = await this.reportData(filters);
    const date = new Date().toISOString().slice(0, 10);
    const baseName = `${REPORT_FILE_NAMES[filters.type]}-${date}`;
    if (filters.format === 'XLSX') return { buffer: await this.toExcel(report), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: `${baseName}.xlsx` };
    return { buffer: await this.toPdf(report), contentType: 'application/pdf', fileName: `${baseName}.pdf` };
  }

  private async reportData(filters: ExportFilters): Promise<ReportData> {
    const { from, to } = this.dates(filters);
    const range = `${from.toLocaleDateString('es-SV')} al ${to.toLocaleDateString('es-SV')}`;
    if (filters.type === 'ASSETS') {
      const assets = await this.prisma.asset.findMany({ where: { ...(filters.assetId ? { id: filters.assetId } : {}), createdAt: { lte: to }, OR: [{ disposalDate: null }, { disposalDate: { gt: to } }] }, include: { category: true, costCenter: true, supplier: true, responsiblePerson: true }, orderBy: { code: 'asc' } });
      return { title: 'Inventario completo de activos', subtitle: `Existencia registrada al ${to.toLocaleDateString('es-SV')}`, headers: ['Código', 'Activo', 'Categoría', 'Cantidad', 'Valor unitario', 'Valor total', 'Estado', 'Ubicación', 'Centro de costo', 'Proveedor'], rows: assets.map((a: any) => [a.code, a.name, a.category.name, a.quantity, a.unitValue, a.quantity * a.unitValue, STATUS_LABELS[a.status] ?? a.status, a.location, a.costCenter?.name ?? '', a.supplier?.name ?? '']) };
    }
    if (filters.type === 'MOVEMENTS') {
      const rows = await this.prisma.assetStockMovement.findMany({ where: { ...(filters.assetId ? { assetId: filters.assetId } : {}), createdAt: { gte: from, lte: to } }, include: { asset: true, performedByUser: true }, orderBy: { createdAt: 'asc' } });
      return { title: 'Movimientos de activos', subtitle: range, headers: ['Fecha', 'Código', 'Activo', 'Tipo', 'Cantidad', 'Existencia anterior', 'Existencia nueva', 'Motivo', 'Registró'], rows: rows.map((m: any) => [m.createdAt.toLocaleString('es-SV'), m.asset.code, m.asset.name, m.type === 'IN' ? 'Entrada' : 'Salida', m.quantity, m.previousQuantity, m.newQuantity, m.reason, m.performedByUser?.name ?? 'Sistema']) };
    }
    if (filters.type === 'CUSTODY') {
      const rows = await this.prisma.assetAssignment.findMany({ where: { ...(filters.assetId ? { assetId: filters.assetId } : {}), startDate: { gte: from, lte: to } }, include: { asset: true, assignedToPerson: true }, orderBy: { startDate: 'asc' } });
      return { title: 'Custodias y préstamos por activo', subtitle: range, headers: ['Código', 'Activo', 'Persona', 'Tipo', 'Cantidad', 'Inicio', 'Vencimiento', 'Estado', 'Motivo'], rows: rows.map((a: any) => [a.asset.code, a.asset.name, a.assignedToPerson.name, a.type === 'LOAN' ? 'Préstamo' : 'Custodia', a.quantity, a.startDate.toLocaleDateString('es-SV'), a.dueDate?.toLocaleDateString('es-SV') ?? '', ASSIGNMENT_LABELS[a.status] ?? a.status, a.reason ?? '']) };
    }
    if (filters.type === 'INVENTORY_STATUS') {
      const assets = await this.prisma.asset.findMany({ where: filters.assetId ? { id: filters.assetId } : undefined, include: { category: true } });
      const grouped = new Map<string, { assets: number; units: number; value: number }>();
      assets.forEach((a: any) => { const key = `${STATUS_LABELS[a.status] ?? a.status} — ${a.category.name}`; const item = grouped.get(key) ?? { assets: 0, units: 0, value: 0 }; item.assets += 1; item.units += a.quantity; item.value += a.quantity * a.unitValue; grouped.set(key, item); });
      return { title: 'Resumen de inventario por estado y categoría', subtitle: `Generado al ${to.toLocaleDateString('es-SV')}`, headers: ['Estado y categoría', 'Activos', 'Unidades', 'Valor total'], rows: [...grouped].map(([key, item]) => [key, item.assets, item.units, item.value]) };
    }
    const rows = await this.prisma.assetAssignment.findMany({ where: { ...(filters.assetId ? { assetId: filters.assetId } : {}), status: AssignmentStatus.ACTIVE }, include: { asset: true, assignedToPerson: true }, orderBy: { assignedToPerson: { name: 'asc' } } });
    return { title: 'Inventario asignado por responsable', subtitle: `Asignaciones activas al ${to.toLocaleDateString('es-SV')}`, headers: ['Responsable', 'Código', 'Activo', 'Tipo', 'Cantidad', 'Valor unitario', 'Valor asignado'], rows: rows.map((a: any) => [a.assignedToPerson.name, a.asset.code, a.asset.name, a.type === 'LOAN' ? 'Préstamo' : 'Custodia', a.quantity, a.asset.unitValue, a.quantity * a.asset.unitValue]) };
  }

  private async toExcel(report: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');
    sheet.addRow([report.title]); sheet.mergeCells(1, 1, 1, report.headers.length);
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0E5A2D' } };
    sheet.addRow([report.subtitle]); sheet.mergeCells(2, 1, 2, report.headers.length);
    sheet.addRow([]); const header = sheet.addRow(report.headers);
    header.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5A2D' } }; });
    report.rows.forEach((row) => sheet.addRow(row));
    sheet.columns.forEach((column) => { let width = 12; column.eachCell?.({ includeEmpty: true }, (cell) => { width = Math.min(36, Math.max(width, String(cell.value ?? '').length + 2)); }); column.width = width; });
    sheet.views = [{ state: 'frozen', ySplit: 4 }]; sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, report.rows.length + 4), column: report.headers.length } };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private toPdf(report: ReportData): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', layout: report.headers.length > 7 ? 'landscape' : 'portrait', margin: 32 });
      const chunks: Buffer[] = []; doc.on('data', (chunk) => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fillColor('#0E5A2D').fontSize(18).text('Universidad UMOAR'); doc.fillColor('#111').fontSize(15).text(report.title); doc.fillColor('#555').fontSize(9).text(report.subtitle); doc.moveDown();
      const pageWidth = doc.page.width - 64; const colWidth = pageWidth / report.headers.length;
      const drawHeader = () => { const y = doc.y; doc.rect(32, y, pageWidth, 22).fill('#0E5A2D'); doc.fillColor('#fff').fontSize(7); report.headers.forEach((header, i) => doc.text(header, 35 + i * colWidth, y + 6, { width: colWidth - 6, ellipsis: true })); doc.y = y + 24; };
      drawHeader(); doc.fillColor('#222').fontSize(7);
      report.rows.forEach((row, rowIndex) => { if (doc.y > doc.page.height - 48) { doc.addPage(); drawHeader(); } const y = doc.y; if (rowIndex % 2) doc.rect(32, y, pageWidth, 20).fill('#F1F7F2'); doc.fillColor('#222'); row.forEach((value, i) => doc.text(String(value ?? ''), 35 + i * colWidth, y + 5, { width: colWidth - 6, ellipsis: true, lineBreak: false })); doc.y = y + 20; });
      doc.end();
    });
  }
}
