import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  CreateTransferDto,
  MarkAssignmentReturnedDto,
  UpdateAssignmentDto,
} from './dto';
import { AssignmentStatus, AssignmentType, AssetHistoryEventType } from '@prisma/client';

@Injectable()
export class AssignmentsService implements OnModuleInit, OnModuleDestroy {
  constructor(private prisma: PrismaService) {}

  private readonly expiryCheckIntervalMs = 60_000;
  private expiryTimer?: NodeJS.Timeout;

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.reconcileExpiredTemporaryAssignments();
    }, this.expiryCheckIntervalMs);
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  private async validateRelations(dto: {
    assetId?: number;
    assignedToPersonId?: number;
    assignedByUserId?: number;
  }) {
    if (dto.assetId) {
      const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
      if (!asset) throw new NotFoundException('Activo no encontrado');
    }
    if (dto.assignedToPersonId) {
      const person = await this.prisma.person.findUnique({ where: { id: dto.assignedToPersonId } });
      if (!person) throw new NotFoundException('Persona asignada no encontrada');
    }
    if (dto.assignedByUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.assignedByUserId } });
      if (!user) throw new NotFoundException('Usuario que asigna no encontrado');
    }
  }

  // ─── Distribución actual de un activo ────────────────────────────────────

  async getAssetDistribution(assetId: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, quantity: true, name: true, code: true },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const activeAssignments = await this.prisma.assetAssignment.findMany({
      where: { assetId, status: AssignmentStatus.ACTIVE },
      include: {
        assignedToPerson: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const assignedQuantity = activeAssignments.reduce((sum: number, a: any) => sum + a.quantity, 0);
    const unassigned = asset.quantity - assignedQuantity;

    return {
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      totalQuantity: asset.quantity,
      assignedQuantity,
      unassigned,
      assignments: activeAssignments.map((a: any) => ({
        assignmentId: a.id,
        personId: a.assignedToPerson.id,
        personName: a.assignedToPerson.name,
        personEmail: a.assignedToPerson.email,
        quantity: a.quantity,
        type: a.type,
        status: a.status,
        startDate: a.startDate,
        dueDate: a.dueDate,
      })),
    };
  }

  // ─── Transferencia con soporte de cantidades ──────────────────────────────

  async createTransfer(dto: CreateTransferDto) {
    const startDate = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    if (dto.type === AssignmentType.LOAN && !dueDate) {
      throw new BadRequestException('La custodia temporal requiere fecha de vencimiento');
    }
    if (dueDate && dueDate < startDate) {
      throw new BadRequestException('La fecha de vencimiento no puede ser anterior a hoy');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const asset = await tx.asset.findUnique({ where: { id: dto.assetId } });
      if (!asset) throw new NotFoundException('Activo no encontrado');

      const toPerson = await tx.person.findUnique({ where: { id: dto.toPersonId } });
      if (!toPerson) throw new NotFoundException('Persona destino no encontrada');

      // Estado actual de distribución
      const activeAssignments: any[] = await tx.assetAssignment.findMany({
        where: { assetId: dto.assetId, status: AssignmentStatus.ACTIVE },
      });

      const totalAssigned = activeAssignments.reduce((s: number, a: any) => s + a.quantity, 0);
      const unassigned = asset.quantity - totalAssigned;

      // Calcular cuánto se toma de fuentes explícitas
      const sourcesQuantity = (dto.sources ?? []).reduce((s: number, src: any) => s + src.quantity, 0);
      const availableFromPool = unassigned;
      const totalAvailable = availableFromPool + sourcesQuantity;
      const sourceAssignmentsForTransfer = (dto.sources ?? [])
        .map((source: any) => activeAssignments.find((assignment: any) => assignment.id === source.assignmentId))
        .filter(Boolean);
      const previousResponsiblePersonId =
        dto.type === AssignmentType.LOAN && sourceAssignmentsForTransfer.length === 1
          ? sourceAssignmentsForTransfer[0].assignedToPersonId
          : undefined;

      if (dto.quantity > totalAvailable) {
        throw new BadRequestException(
          `Cantidad insuficiente. Disponible: ${availableFromPool} libres + ${sourcesQuantity} de fuentes = ${totalAvailable}. Solicitado: ${dto.quantity}`,
        );
      }

      // Validar y reducir asignaciones fuente
      if (dto.sources && dto.sources.length > 0) {
        for (const source of dto.sources) {
          const sourceAssignment = activeAssignments.find((a: any) => a.id === source.assignmentId);
          if (!sourceAssignment) {
            throw new NotFoundException(`Asignación fuente ${source.assignmentId} no encontrada o no está activa`);
          }
          if (source.quantity > sourceAssignment.quantity) {
            throw new BadRequestException(
              `La asignación ${source.assignmentId} solo tiene ${sourceAssignment.quantity} unidades, no se pueden tomar ${source.quantity}`,
            );
          }

          const remaining = sourceAssignment.quantity - source.quantity;
          if (remaining === 0) {
            await tx.assetAssignment.update({
              where: { id: source.assignmentId },
              data: { status: AssignmentStatus.RETURNED, returnDate: new Date() },
            });
          } else {
            await tx.assetAssignment.update({
              where: { id: source.assignmentId },
              data: { quantity: remaining },
            });
          }
        }
      }

      // Crear nueva asignación para el destino
      const newAssignment = await tx.assetAssignment.create({
        data: {
          assetId: dto.assetId,
          assignedToPersonId: dto.toPersonId,
          assignedByUserId: dto.assignedByUserId,
          quantity: dto.quantity,
          type: dto.type,
          status: AssignmentStatus.ACTIVE,
          previousResponsiblePersonId,
          startDate,
          dueDate,
          reason: dto.reason,
          notes: dto.notes,
          documentUrl: dto.documentUrl,
          documentPublicId: dto.documentPublicId,
        },
        include: {
          asset: { select: { id: true, code: true, name: true, status: true } },
          assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          assignedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      // Registrar en historial
      await tx.assetHistory.create({
        data: {
          assetId: dto.assetId,
          changedByUserId: dto.assignedByUserId,
          eventType:
            dto.type === AssignmentType.LOAN
              ? AssetHistoryEventType.LOANED
              : AssetHistoryEventType.TRANSFERRED,
          newUser: toPerson.name,
          changeReason: dto.reason ?? null,
          notes: dto.notes ?? null,
          source: 'transfer',
        },
      });

      return newAssignment;
    });
  }

  // ─── CRUD original (mantener compatibilidad) ──────────────────────────────

  async create(createAssignmentDto: CreateAssignmentDto) {
    await this.validateRelations(createAssignmentDto);

    const startDate = createAssignmentDto.startDate
      ? new Date(createAssignmentDto.startDate)
      : new Date();
    const dueDate = createAssignmentDto.dueDate
      ? new Date(createAssignmentDto.dueDate)
      : undefined;

    if (createAssignmentDto.type === AssignmentType.LOAN && !dueDate) {
      throw new BadRequestException('La custodia temporal requiere fecha de vencimiento');
    }
    if (dueDate && dueDate < startDate) {
      throw new BadRequestException('La fecha de vencimiento no puede ser menor a la fecha de inicio');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const asset = await tx.asset.findUnique({
        where: { id: createAssignmentDto.assetId },
        include: { responsiblePerson: true },
      });
      if (!asset) throw new NotFoundException('Activo no encontrado');

      const assignment = await tx.assetAssignment.create({
        data: {
          assetId: createAssignmentDto.assetId,
          assignedToPersonId: createAssignmentDto.assignedToPersonId,
          assignedByUserId: createAssignmentDto.assignedByUserId,
          previousResponsiblePersonId: asset.responsiblePersonId ?? undefined,
          type: createAssignmentDto.type,
          status: createAssignmentDto.status ?? AssignmentStatus.ACTIVE,
          startDate,
          dueDate,
          returnDate: createAssignmentDto.returnDate
            ? new Date(createAssignmentDto.returnDate)
            : undefined,
          reason: createAssignmentDto.reason,
          notes: createAssignmentDto.notes,
        },
        include: {
          asset: { select: { id: true, code: true, name: true, status: true } },
          assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          previousResponsiblePerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          assignedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.asset.update({
        where: { id: createAssignmentDto.assetId },
        data: { responsiblePersonId: createAssignmentDto.assignedToPersonId },
      });

      await tx.assetHistory.create({
        data: {
          assetId: createAssignmentDto.assetId,
          changedByUserId: createAssignmentDto.assignedByUserId,
          eventType:
            createAssignmentDto.type === AssignmentType.LOAN
              ? AssetHistoryEventType.LOANED
              : AssetHistoryEventType.CUSTODY_ASSIGNED,
          previousUser: asset.responsiblePerson?.name ?? null,
          newUser: assignment.assignedToPerson.name,
          changeReason: createAssignmentDto.reason ?? null,
          notes: createAssignmentDto.notes ?? null,
          source: 'assignment',
        },
      });

      return assignment;
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: string;
    type?: string;
    asset?: string;
    person?: string;
    quantity?: string;
    dueDate?: string;
    document?: string;
  }) {
    const { skip = 0, take = 20, status, type, asset, person, quantity, dueDate, document } = params;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (asset) where.asset = { OR: [
      { code: { contains: asset, mode: 'insensitive' } },
      { name: { contains: asset, mode: 'insensitive' } },
    ] };
    if (person) where.assignedToPerson = { name: { contains: person, mode: 'insensitive' } };
    const parsedQuantity = quantity !== undefined && quantity !== '' ? Number(quantity) : undefined;
    if (Number.isFinite(parsedQuantity)) where.quantity = parsedQuantity;
    if (dueDate) {
      const start = new Date(`${dueDate}T00:00:00.000Z`);
      const end = new Date(`${dueDate}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime())) where.dueDate = { gte: start, lte: end };
    }
    if (document === 'WITH') where.documentUrl = { not: null };
    if (document === 'WITHOUT') where.documentUrl = null;

    const safeSkip = Math.max(0, skip);
    const safeTake = Math.min(100, Math.max(1, take));
    const [data, total] = await Promise.all([
      this.prisma.assetAssignment.findMany({
        where,
        include: {
          asset: { select: { id: true, code: true, name: true, status: true } },
          assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          previousResponsiblePerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          assignedByUser: { select: { id: true, name: true, email: true } },
        },
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assetAssignment.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: number) {
    const assignment = await this.prisma.assetAssignment.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, code: true, name: true, status: true } },
        assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
        previousResponsiblePerson: { select: { id: true, name: true, email: true, documentNumber: true } },
        assignedByUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Asignacion no encontrada');
    return assignment;
  }

  async update(id: number, updateAssignmentDto: UpdateAssignmentDto) {
    await this.findOne(id);
    await this.validateRelations(updateAssignmentDto);

    const data: any = {
      ...updateAssignmentDto,
      startDate: updateAssignmentDto.startDate ? new Date(updateAssignmentDto.startDate) : undefined,
      dueDate: updateAssignmentDto.dueDate ? new Date(updateAssignmentDto.dueDate) : undefined,
      returnDate: updateAssignmentDto.returnDate ? new Date(updateAssignmentDto.returnDate) : undefined,
    };

    if (data.dueDate && data.startDate && data.dueDate < data.startDate) {
      throw new BadRequestException('La fecha de vencimiento no puede ser menor a la fecha de inicio');
    }

    return this.prisma.assetAssignment.update({
      where: { id },
      data,
      include: {
        asset: { select: { id: true, code: true, name: true, status: true } },
        assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
        previousResponsiblePerson: { select: { id: true, name: true, email: true, documentNumber: true } },
        assignedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async markReturned(id: number, dto: MarkAssignmentReturnedDto) {
    const assignment = await this.findOne(id);

    if (assignment.type !== AssignmentType.LOAN) {
      throw new BadRequestException('Solo las custodias temporales pueden devolverse');
    }

    const nextReturnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    return this.prisma.$transaction(async (tx: any) => {
      if (dto.restorePreviousCustody && assignment.previousResponsiblePersonId) {
        // Restaurar cantidad al responsable previo si tenía asignación activa
        const prevAssignment = await tx.assetAssignment.findFirst({
          where: {
            assetId: assignment.assetId,
            assignedToPersonId: assignment.previousResponsiblePersonId,
            status: AssignmentStatus.ACTIVE,
          },
        });

        if (prevAssignment) {
          await tx.assetAssignment.update({
            where: { id: prevAssignment.id },
            data: { quantity: prevAssignment.quantity + (assignment as any).quantity },
          });
        } else {
          await tx.assetAssignment.create({
            data: {
              assetId: assignment.assetId,
              assignedToPersonId: assignment.previousResponsiblePersonId,
              assignedByUserId: assignment.assignedByUserId,
              type: AssignmentType.CUSTODY,
              status: AssignmentStatus.ACTIVE,
              quantity: (assignment as any).quantity,
              startDate: nextReturnDate,
              reason: 'Retorno a custodia previa',
              notes: dto.notes,
            },
          });
        }
      }

      const updated = await tx.assetAssignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.RETURNED,
          returnDate: nextReturnDate,
          notes: dto.notes,
        },
        include: {
          asset: { select: { id: true, code: true, name: true, status: true } },
          assignedToPerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          previousResponsiblePerson: { select: { id: true, name: true, email: true, documentNumber: true } },
          assignedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.assetHistory.create({
        data: {
          assetId: assignment.assetId,
          changedByUserId: assignment.assignedByUserId,
          eventType: AssetHistoryEventType.RETURNED,
          previousUser: assignment.assignedToPerson.name,
          newUser: dto.restorePreviousCustody ? assignment.previousResponsiblePerson?.name ?? null : null,
          changeReason: dto.notes ?? (dto.restorePreviousCustody ? 'Retorno a custodia previa' : 'Retorno a inventario libre'),
          notes: dto.notes ?? null,
          source: 'assignment',
        },
      });

      return updated;
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.assetAssignment.delete({ where: { id } });
  }

  private async reconcileExpiredTemporaryAssignments() {
    const expiredAssignments = await this.prisma.assetAssignment.findMany({
      where: {
        type: AssignmentType.LOAN,
        status: AssignmentStatus.ACTIVE,
        dueDate: { not: null, lte: new Date() },
        previousResponsiblePersonId: { not: null },
      },
    });

    for (const assignment of expiredAssignments) {
      await this.prisma.$transaction(async (tx: any) => {
        if (assignment.previousResponsiblePersonId) {
          await tx.asset.update({
            where: { id: assignment.assetId },
            data: { responsiblePersonId: assignment.previousResponsiblePersonId },
          });
        }

        await tx.assetAssignment.update({
          where: { id: assignment.id },
          data: {
            status: AssignmentStatus.RETURNED,
            returnDate: new Date(),
            notes: assignment.notes ?? 'Reversión automática por vencimiento',
          },
        });

        await tx.assetHistory.create({
          data: {
            assetId: assignment.assetId,
            changedByUserId: assignment.assignedByUserId,
            eventType: AssetHistoryEventType.RETURNED,
            previousUser: assignment.assignedToPersonId.toString(),
            newUser: assignment.previousResponsiblePersonId?.toString() ?? null,
            changeReason: 'Reversión automática por vencimiento',
            source: 'assignment-expiry',
          },
        });
      });
    }
  }
}
