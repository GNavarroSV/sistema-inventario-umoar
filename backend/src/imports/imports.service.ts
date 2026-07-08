import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import { AssetsService } from '../assets/assets.service';
import { AssetStockMovementType } from '../assets/dto';

type ImportStrategy = 'UPSERT' | 'INSERT_ONLY' | 'DRY_RUN';
type AssetStatusValue = 'OPERATIVO' | 'OBSOLETO' | 'MAL_ESTADO' | 'DESUSO' | 'REPARACION' | 'DESCARTADO';

type NormalizedImportRow = {
  code?: string;
  serialNumber?: string;
  name?: string;
  description?: string;
  category?: string;
  quantity?: number;
  responsiblePerson?: string;
  location?: string;
  acquisitionDate?: string;
  unitValue?: number;
  costCenter?: string;
  supplier?: string;
  status?: AssetStatusValue;
  manufacturer?: string;
  model?: string;
  invoiceNumber?: string;
  purchaseOrder?: string;
  warrantyEndDate?: string;
  warrantyMonths?: number;
  notes?: string;
  [key: string]: unknown;
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: AssetsService,
  ) {}

  private normalizeHeaderKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  private detectCsvDelimiter(text: string): ',' | ';' {
    const firstLine = text
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? '';
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const semicolonCount = (firstLine.match(/;/g) ?? []).length;

    return semicolonCount > commaCount ? ';' : ',';
  }

  private parseCsv(text: string): Record<string, unknown>[] {
    return parse(text, {
      columns: true,
      delimiter: this.detectCsvDelimiter(text),
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[];
  }

  private mapHeader(header: string): string {
    const key = this.normalizeHeaderKey(header);

    const aliases: Record<string, string> = {
      codigo: 'code',
      code: 'code',
      numerodeserie: 'serialNumber',
      numeroserie: 'serialNumber',
      serialnumber: 'serialNumber',
      serie: 'serialNumber',
      nombre: 'name',
      name: 'name',
      descripcion: 'description',
      description: 'description',
      categoria: 'category',
      category: 'category',
      cantidad: 'quantity',
      quantity: 'quantity',
      responsable: 'responsiblePerson',
      personaresponsable: 'responsiblePerson',
      responsibleperson: 'responsiblePerson',
      ubicacion: 'location',
      location: 'location',
      fechaadquisicion: 'acquisitionDate',
      acquisitiondate: 'acquisitionDate',
      fechaadquisicionocompra: 'acquisitionDate',
      valorunitario: 'unitValue',
      unitvalue: 'unitValue',
      centrodecosto: 'costCenter',
      costcenter: 'costCenter',
      proveedor: 'supplier',
      supplier: 'supplier',
      estado: 'status',
      status: 'status',
      fabricante: 'manufacturer',
      manufacturer: 'manufacturer',
      modelo: 'model',
      model: 'model',
      numerofactura: 'invoiceNumber',
      invoicenumber: 'invoiceNumber',
      ordencompra: 'purchaseOrder',
      purchaseorder: 'purchaseOrder',
      fingarantia: 'warrantyEndDate',
      warrantyenddate: 'warrantyEndDate',
      mesesgarantia: 'warrantyMonths',
      warrantymonths: 'warrantyMonths',
      notas: 'notes',
      notes: 'notes',
    };

    return aliases[key] ?? header.trim();
  }

  private normalizeRow(row: Record<string, unknown>): NormalizedImportRow {
    const normalized: NormalizedImportRow = {};

    for (const [rawKey, rawValue] of Object.entries(row)) {
      const key = this.mapHeader(String(rawKey));
      const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

      if (value === '' || value === null || value === undefined) {
        continue;
      }

      switch (key) {
        case 'quantity':
        case 'unitValue':
        case 'warrantyMonths':
          normalized[key] = this.toNumber(String(value));
          break;
        case 'status':
          normalized[key] = String(value).toUpperCase() as AssetStatusValue;
          break;
        default:
          normalized[key] = String(value);
      }
    }

    return normalized;
  }

  private toNumber(value: string): number | undefined {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const [day, month, year] = parts;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? undefined : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private async findCategoryId(value?: string): Promise<number | null> {
    if (!value) return null;

    const category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return category?.id ?? null;
  }

  private async findPersonId(value?: string): Promise<number | null> {
    if (!value) return null;

    const person = await this.prisma.person.findFirst({
      where: {
        OR: [
          { name: { equals: value, mode: 'insensitive' } },
          { email: { equals: value, mode: 'insensitive' } },
          { documentNumber: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return person?.id ?? null;
  }

  private async findCostCenterId(value?: string): Promise<number | null> {
    if (!value) return null;

    const costCenter = await this.prisma.costCenter.findFirst({
      where: {
        OR: [
          { code: { equals: value, mode: 'insensitive' } },
          { name: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return costCenter?.id ?? null;
  }

  private async findSupplierId(value?: string): Promise<number | null> {
    if (!value) return null;

    const supplier = await this.prisma.supplier.findFirst({
      where: {
        OR: [
          { name: { equals: value, mode: 'insensitive' } },
          { taxId: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return supplier?.id ?? null;
  }

  private generateAssetCode(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ACT-${datePart}-${random}`;
  }

  private async resolveAssetByIdentifiers(row: NormalizedImportRow) {
    const filters: Array<Record<string, string>> = [];

    if (row.code) filters.push({ code: row.code });
    if (row.serialNumber) filters.push({ serialNumber: row.serialNumber });

    if (!filters.length) return null;

    return this.prisma.asset.findFirst({ where: { OR: filters } });
  }

  private async resolveAssetInput(row: NormalizedImportRow, mode: 'create' | 'update') {
    const categoryId = await this.findCategoryId(row.category);
    const responsiblePersonId = await this.findPersonId(row.responsiblePerson);
    const costCenterId = await this.findCostCenterId(row.costCenter);
    const supplierId = await this.findSupplierId(row.supplier);

    const shared = {
      name: row.name,
      description: row.description,
      categoryId: categoryId ?? undefined,
      quantity: row.quantity ?? undefined,
      responsiblePersonId: responsiblePersonId ?? undefined,
      location: row.location,
      acquisitionDate: this.parseDate(row.acquisitionDate),
      unitValue: row.unitValue,
      costCenterId: costCenterId ?? undefined,
      supplierId: supplierId ?? undefined,
      status: row.status,
      serialNumber: row.serialNumber,
      manufacturer: row.manufacturer,
      model: row.model,
      invoiceNumber: row.invoiceNumber,
      purchaseOrder: row.purchaseOrder,
      warrantyEndDate: this.parseDate(row.warrantyEndDate),
      warrantyMonths: row.warrantyMonths,
    };

    if (mode === 'create') {
      const missing: string[] = [];
      if (!shared.name) missing.push('name');
      if (!shared.categoryId) missing.push('category');
      if (!shared.responsiblePersonId) missing.push('responsiblePerson');
      if (!shared.location) missing.push('location');
      if (shared.unitValue === undefined) missing.push('unitValue');

      return { shared, missing };
    }

    return { shared, missing: [] as string[] };
  }

  async dryRun(file: any, strategy: ImportStrategy = 'UPSERT', notes?: string, createdByUserId?: number) {
    if (!file) throw new BadRequestException('File is required');

    const text = file.buffer.toString('utf8');
    const rawRows = this.parseCsv(text);
    const rows = rawRows.map((row) => this.normalizeRow(row));

    const batch = await this.prisma.importBatch.create({
      data: {
        fileName: file.originalname,
        strategy,
        status: 'PENDING',
        totalRows: rows.length,
        notes,
        createdByUserId,
      },
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const existing = await this.resolveAssetByIdentifiers(row);

      if (existing && strategy === 'INSERT_ONLY') {
        skipped += 1;
        await this.prisma.importBatchItem.create({
          data: {
            batchId: batch.id,
            rowNumber: index + 1,
            assetId: existing.id,
            rawData: row as object,
            status: 'SKIPPED',
            action: 'SKIP_EXISTING',
            errorMessage: 'El activo ya existe y la carga inicial no modifica registros.',
          },
        });
        continue;
      }

      const isUpdate = Boolean(existing);
      const { shared, missing } = await this.resolveAssetInput(row, isUpdate ? 'update' : 'create');

      if (!isUpdate && missing.length > 0) {
        errors++;
        await this.prisma.importBatchItem.create({
          data: {
            batchId: batch.id,
            rowNumber: index + 1,
            rawData: row as object,
            status: 'ERROR',
            errorMessage: `Faltan campos requeridos: ${missing.join(', ')}`,
            changeSet: shared as object,
          },
        });
        continue;
      }

      const action = isUpdate ? 'UPDATE' : 'CREATE';
      if (isUpdate) updated += 1;
      else created += 1;

      await this.prisma.importBatchItem.create({
        data: {
          batchId: batch.id,
          rowNumber: index + 1,
          assetId: existing?.id,
          rawData: row as object,
          changeSet: shared as object,
          status: 'VALID',
          action,
        },
      });
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        processedRows: rows.length,
        createdRows: created,
        updatedRows: updated,
        skippedRows: skipped,
        errorRows: errors,
        status: 'COMPLETED',
      },
    });

    return { batchId: batch.id, total: rows.length, created, updated, skipped, errors };
  }

  async getStockTemplate(): Promise<string> {
    const assets = await this.prisma.asset.findMany({
      where: { isActive: true },
      select: { code: true, name: true, quantity: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
    const escapeCsv = (value: string | number) => {
      const text = String(value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = assets.map((asset: { code: string; name: string; quantity: number }) => [
      asset.code,
      asset.name,
      asset.quantity,
      '',
      '',
      '',
    ]);

    return [
      ['código', 'nombre', 'stock_actual', 'aumento_disminución', 'motivo', 'notas'],
      ...rows,
    ].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  }

  async stockDryRun(file: any, createdByUserId?: number) {
    if (!file) throw new BadRequestException('El archivo es requerido');

    const text = file.buffer.toString('utf8');
    const rows = this.parseCsv(text);

    const batch = await this.prisma.importBatch.create({
      data: {
        fileName: file.originalname,
        strategy: 'INSERT_ONLY',
        status: 'PENDING',
        totalRows: rows.length,
        notes: 'Carga masiva de movimientos de stock',
        createdByUserId,
      },
    });

    let valid = 0;
    let errors = 0;
    let skipped = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index];
      const values = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          this.normalizeHeaderKey(key),
          typeof value === 'string' ? value.trim() : value,
        ]),
      );
      const code = String(values.codigo ?? values.code ?? '').trim();
      const serialNumber = String(values.serie ?? values.numerodeserie ?? values.serialnumber ?? '').trim();
      const adjustmentValue = values.aumentodisminucion ?? values.ajuste;
      const signedAdjustment = Number(adjustmentValue);
      const rawType = String(values.tipo ?? values.movimiento ?? '').trim().toUpperCase();
      const rawQuantity = Number(values.cantidad ?? values.quantity);
      const type = Number.isFinite(signedAdjustment) && signedAdjustment !== 0
        ? signedAdjustment > 0 ? AssetStockMovementType.IN : AssetStockMovementType.OUT
        : ['IN', 'ENTRADA', 'AUMENTO'].includes(rawType)
          ? AssetStockMovementType.IN
          : ['OUT', 'SALIDA', 'DISMINUCION'].includes(rawType)
            ? AssetStockMovementType.OUT
            : undefined;
      const quantity = Number.isFinite(signedAdjustment) && signedAdjustment !== 0
        ? Math.abs(signedAdjustment)
        : rawQuantity;
      const reason = String(values.motivo ?? values.reason ?? '').trim();
      const notes = String(values.notas ?? values.notes ?? '').trim() || undefined;
      const hasAdjustment = adjustmentValue !== undefined && String(adjustmentValue).trim() !== '';
      const asset = code || serialNumber
        ? await this.prisma.asset.findFirst({
            where: {
              OR: [
                ...(code ? [{ code }] : []),
                ...(serialNumber ? [{ serialNumber }] : []),
              ],
            },
            include: {
              assignments: { where: { status: 'ACTIVE' }, select: { quantity: true } },
            },
          })
        : null;

      const rowErrors: string[] = [];
      if (!code && !serialNumber) rowErrors.push('Debe indicar código o serie');
      if (!asset) rowErrors.push('No se encontró el activo');
      if (hasAdjustment && !type) rowErrors.push('Indique un aumento positivo o una disminución negativa');
      if (hasAdjustment && (!Number.isInteger(quantity) || quantity <= 0)) {
        rowErrors.push('El ajuste debe ser un número entero distinto de cero');
      }
      if (hasAdjustment && !reason) rowErrors.push('El motivo es requerido');

      if (asset && type === AssetStockMovementType.OUT && Number.isInteger(quantity) && quantity > 0) {
        const assigned = asset.assignments.reduce(
          (sum: number, assignment: { quantity: number }) => sum + assignment.quantity,
          0,
        );
        const free = asset.quantity - assigned;
        if (quantity > free) {
          rowErrors.push(`Solo hay ${free} unidades libres; las asignadas deben descargarse individualmente`);
        }
      }

      const changeSet = asset && type && Number.isInteger(quantity) && quantity > 0
        ? { assetId: asset.id, type, quantity, reason, notes }
        : undefined;

      const rowStatus = !hasAdjustment ? 'SKIPPED' : rowErrors.length ? 'ERROR' : 'VALID';
      await this.prisma.importBatchItem.create({
        data: {
          batchId: batch.id,
          rowNumber: index + 1,
          assetId: asset?.id,
          rawData: raw as object,
          changeSet,
          action: type ? `STOCK_${type}` : 'STOCK_INVALID',
          status: rowStatus,
          errorMessage: rowErrors.length ? rowErrors.join('. ') : undefined,
        },
      });

      if (!hasAdjustment) skipped += 1;
      else if (rowErrors.length) errors += 1;
      else valid += 1;
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: { errorRows: errors, skippedRows: skipped },
    });

    return { batchId: batch.id, total: rows.length, valid, skipped, errors };
  }

  async execute(batchId: number) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) throw new BadRequestException('Batch not found');
    if (batch.status === 'PROCESSING') throw new BadRequestException('Batch already processing');
    if (batch.errorRows > 0) {
      throw new BadRequestException('La carga contiene filas con errores. Corrija el archivo y vuelva a previsualizarlo antes de ejecutar.');
    }

    await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'PROCESSING' } });

    let created = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of batch.items) {
      try {
        if (item.status === 'SKIPPED' || item.status === 'ERROR') {
          skipped += 1;
          continue;
        }
        if (item.action === 'STOCK_IN' || item.action === 'STOCK_OUT') {
          if (item.status !== 'VALID' || !item.assetId || !item.changeSet) {
            throw new Error(item.errorMessage ?? 'Movimiento de stock inválido');
          }
          const movement = item.changeSet as Record<string, unknown>;
          const type = item.action === 'STOCK_IN'
            ? AssetStockMovementType.IN
            : AssetStockMovementType.OUT;
          const quantity = Number(movement.quantity);

          await this.assetsService.createStockMovement(
            item.assetId,
            {
              type,
              quantity,
              freeQuantity: type === AssetStockMovementType.OUT ? quantity : undefined,
              reason: String(movement.reason),
              notes: movement.notes ? String(movement.notes) : undefined,
            },
            batch.createdByUserId ?? undefined,
          );
          await this.prisma.importBatchItem.update({
            where: { id: item.id },
            data: { status: 'UPDATED' },
          });
          updated += 1;
          continue;
        }

        const row = this.normalizeRow(item.rawData as Record<string, unknown>);
        const existing = await this.resolveAssetByIdentifiers(row);
        const { shared, missing } = await this.resolveAssetInput(row, existing ? 'update' : 'create');

        if (!existing && missing.length > 0) {
          throw new Error(`Faltan campos requeridos: ${missing.join(', ')}`);
        }

        if (!existing) {
          const asset = await this.prisma.asset.create({
            data: {
              code: this.generateAssetCode(),
              name: shared.name ?? 'Activo importado',
              description: shared.description,
              categoryId: shared.categoryId!,
              quantity: shared.quantity ?? 1,
              responsiblePersonId: shared.responsiblePersonId!,
              location: shared.location!,
              acquisitionDate: shared.acquisitionDate,
              unitValue: shared.unitValue ?? 0,
              costCenterId: shared.costCenterId,
              supplierId: shared.supplierId,
              status: shared.status,
              serialNumber: shared.serialNumber,
              manufacturer: shared.manufacturer,
              model: shared.model,
              invoiceNumber: shared.invoiceNumber,
              purchaseOrder: shared.purchaseOrder,
              warrantyEndDate: shared.warrantyEndDate,
              warrantyMonths: shared.warrantyMonths,
            } as any,
          });

          await this.prisma.importBatchItem.update({
            where: { id: item.id },
            data: { status: 'CREATED', assetId: asset.id },
          });
          created += 1;
          continue;
        }

        const updateData: Record<string, unknown> = {};

        if (shared.name !== undefined) updateData.name = shared.name;
        if (shared.description !== undefined) updateData.description = shared.description;
        if (shared.categoryId !== undefined) updateData.categoryId = shared.categoryId;
        if (shared.quantity !== undefined) updateData.quantity = shared.quantity;
        if (shared.responsiblePersonId !== undefined) updateData.responsiblePersonId = shared.responsiblePersonId;
        if (shared.location !== undefined) updateData.location = shared.location;
        if (shared.acquisitionDate !== undefined) updateData.acquisitionDate = shared.acquisitionDate;
        if (shared.unitValue !== undefined) updateData.unitValue = shared.unitValue;
        if (shared.costCenterId !== undefined) updateData.costCenterId = shared.costCenterId;
        if (shared.supplierId !== undefined) updateData.supplierId = shared.supplierId;
        if (shared.status !== undefined) updateData.status = shared.status;
        if (shared.serialNumber !== undefined) updateData.serialNumber = shared.serialNumber;
        if (shared.manufacturer !== undefined) updateData.manufacturer = shared.manufacturer;
        if (shared.model !== undefined) updateData.model = shared.model;
        if (shared.invoiceNumber !== undefined) updateData.invoiceNumber = shared.invoiceNumber;
        if (shared.purchaseOrder !== undefined) updateData.purchaseOrder = shared.purchaseOrder;
        if (shared.warrantyEndDate !== undefined) updateData.warrantyEndDate = shared.warrantyEndDate;
        if (shared.warrantyMonths !== undefined) updateData.warrantyMonths = shared.warrantyMonths;

        await this.prisma.asset.update({
          where: { id: existing.id },
          data: updateData as any,
        });

        await this.prisma.importBatchItem.update({
          where: { id: item.id },
          data: { status: 'UPDATED', assetId: existing.id },
        });
        updated += 1;
      } catch (error) {
        failed += 1;
        await this.prisma.importBatchItem.update({
          where: { id: item.id },
          data: {
            status: 'ERROR',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: failed > 0 ? 'FAILED' : 'COMPLETED',
        processedRows: batch.items.length,
        createdRows: created,
        updatedRows: updated,
        errorRows: failed,
        processedAt: new Date(),
      },
    });

    return { batchId, created, updated, failed };
  }

  async getBatch(batchId: number) {
    return this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });
  }
}
