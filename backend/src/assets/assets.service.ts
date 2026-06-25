import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssetStockMovementType,
  CreateAssetDto,
  CreateAssetStockMovementDto,
  UpdateAssetDto,
} from './dto';
import {
  Asset,
  AssetHistoryEventType,
  AssetStatus,
  AssignmentStatus,
} from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera un código único para el activo
   */
  private async generateAssetCode(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ACT-${datePart}-${random}`;
  }

  /**
   * Calcula la depreciación del activo
   */
  /**
   * Crear un nuevo activo
   */
  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    const code = await this.generateAssetCode();

    const asset = await this.prisma.asset.create({
      data: {
        code,
        name: createAssetDto.name,
        description: createAssetDto.description,
        categoryId: createAssetDto.categoryId,
        quantity: createAssetDto.quantity ?? 1,
        responsiblePersonId: createAssetDto.responsiblePersonId,
        location: createAssetDto.location,
        costCenterId: createAssetDto.costCenterId,
        acquisitionDate: createAssetDto.acquisitionDate
          ? new Date(createAssetDto.acquisitionDate)
          : undefined,
        unitValue: createAssetDto.unitValue,
        supplierId: createAssetDto.supplierId,
        invoiceNumber: createAssetDto.invoiceNumber,
        purchaseOrder: createAssetDto.purchaseOrder,
        warrantyEndDate: createAssetDto.warrantyEndDate
          ? new Date(createAssetDto.warrantyEndDate)
          : undefined,
        warrantyMonths: createAssetDto.warrantyMonths,
        depreciationType: createAssetDto.depreciationType,
        depreciationRate: createAssetDto.depreciationRate,
        depreciationMonths: createAssetDto.depreciationMonths,
        serialNumber: createAssetDto.serialNumber,
        manufacturer: createAssetDto.manufacturer,
        model: createAssetDto.model,
      },
      include: {
        category: true,
        costCenter: true,
        supplier: true,
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return asset;
  }

  /**
   * Obtener todos los activos
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: AssetStatus;
    code?: string;
    name?: string;
    responsible?: string;
    location?: string;
    quantity?: string;
    unitValue?: string;
  }): Promise<{ data: Asset[]; total: number }> {
    const { skip, take, status, code, name, responsible, location, quantity, unitValue } = params;
    const parsedQuantity = quantity !== undefined && quantity !== '' ? Number(quantity) : undefined;
    const parsedUnitValue = unitValue !== undefined && unitValue !== '' ? Number(unitValue) : undefined;
    const where: any = {
      ...(status ? { status } : {}),
      ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
      ...(responsible ? { responsiblePerson: { name: { contains: responsible, mode: 'insensitive' } } } : {}),
      ...(location ? { location: { contains: location, mode: 'insensitive' } } : {}),
      ...(Number.isFinite(parsedQuantity) ? { quantity: parsedQuantity } : {}),
      ...(Number.isFinite(parsedUnitValue) ? { unitValue: parsedUnitValue } : {}),
    };
    const safeSkip = Number.isFinite(skip as number) && (skip ?? 0) > 0 ? Math.floor(skip as number) : 0;
    const safeTake = Number.isFinite(take as number) && (take ?? 0) > 0 ? Math.floor(take as number) : 20;

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: {
          category: true,
          responsiblePerson: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Obtener un activo por ID
   */
  async findOne(id: number): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToPerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            previousResponsiblePerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            performedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Activo con ID ${id} no encontrado`);
    }

    return asset;
  }

  /**
   * Actualizar un activo
   */
  async update(id: number, updateAssetDto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    if (asset.status === AssetStatus.DESCARTADO) {
      throw new BadRequestException('Un activo descartado no se puede modificar');
    }
    if (updateAssetDto.status === AssetStatus.DESCARTADO) {
      throw new BadRequestException('Use la acción Descartar activo');
    }

    const updateData: any = {
      ...updateAssetDto,
      acquisitionDate: updateAssetDto.acquisitionDate
        ? new Date(updateAssetDto.acquisitionDate)
        : undefined,
      warrantyEndDate: updateAssetDto.warrantyEndDate
        ? new Date(updateAssetDto.warrantyEndDate)
        : undefined,
    };

    const updated = await this.prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        supplier: true,
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToPerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            previousResponsiblePerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Registrar cambios en historial
    if (updateAssetDto.status && updateAssetDto.status !== asset.status) {
      await this.prisma.assetHistory.create({
        data: {
          assetId: id,
          previousStatus: asset.status,
          newStatus: updateAssetDto.status,
          changeReason: `Estado cambió de ${asset.status} a ${updateAssetDto.status}`,
        },
      });
    }

    return updated;
  }

  /**
   * Cambiar estado de un activo
   */
  async updateStatus(
    id: number,
    newStatus: AssetStatus,
    reason?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);
    if (asset.status === AssetStatus.DESCARTADO) {
      throw new BadRequestException('El descarte de un activo no se puede revertir');
    }
    if (newStatus === AssetStatus.DESCARTADO) {
      throw new BadRequestException('Use la acción Descartar activo');
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: newStatus },
      include: {
        category: true,
        supplier: true,
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToPerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            previousResponsiblePerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Registrar en historial
    await this.prisma.assetHistory.create({
      data: {
        assetId: id,
        previousStatus: asset.status,
        newStatus,
        changeReason: reason,
      },
    });

    return updated;
  }

  /**
   * Buscar activos por código
   */
  async findByCode(code: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { code },
      include: {
        category: true,
        supplier: true,
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToPerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            previousResponsiblePerson: {
              select: {
                id: true,
                name: true,
                email: true,
                documentNumber: true,
              },
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Activo con código ${code} no encontrado`);
    }

    return asset;
  }

  async discard(id: number, disposalDateValue: string, performedByUserId?: number) {
    const disposalDate = new Date(`${disposalDateValue.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(disposalDate.getTime())) {
      throw new BadRequestException('La fecha de descarte no es válida');
    }
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (disposalDate > endOfToday) {
      throw new BadRequestException('La fecha de descarte no puede estar en el futuro');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const asset = await tx.asset.findUnique({ where: { id } });
      if (!asset) throw new NotFoundException('Activo no encontrado');
      if (asset.status === AssetStatus.DESCARTADO || !asset.isActive) {
        throw new BadRequestException('El activo ya fue descartado');
      }

      const assignments = await tx.assetAssignment.findMany({
        where: { assetId: id, status: AssignmentStatus.ACTIVE },
        include: { assignedToPerson: { select: { id: true, name: true } } },
      });
      const assignedQuantity = assignments.reduce(
        (sum: number, assignment: any) => sum + assignment.quantity,
        0,
      );
      if (assignedQuantity > asset.quantity) {
        throw new BadRequestException('Las asignaciones superan el stock registrado');
      }

      if (assignments.length) {
        await tx.assetAssignment.updateMany({
          where: { id: { in: assignments.map((assignment: any) => assignment.id) } },
          data: { status: AssignmentStatus.CANCELLED, returnDate: disposalDate },
        });
      }

      if (asset.quantity > 0) {
        await tx.assetStockMovement.create({
          data: {
            assetId: id,
            performedByUserId,
            type: 'OUT',
            quantity: asset.quantity,
            freeQuantity: asset.quantity - assignedQuantity,
            previousQuantity: asset.quantity,
            newQuantity: 0,
            reason: 'Descarte total del activo',
            notes: `Fecha de descarte: ${disposalDateValue.slice(0, 10)}`,
            sourceBreakdown: assignments.map((assignment: any) => ({
              assignmentId: assignment.id,
              personId: assignment.assignedToPersonId,
              personName: assignment.assignedToPerson.name,
              quantity: assignment.quantity,
            })),
          },
        });
      }

      await tx.assetHistory.create({
        data: {
          assetId: id,
          changedByUserId: performedByUserId,
          eventType: AssetHistoryEventType.DISPOSED,
          previousStatus: asset.status,
          newStatus: AssetStatus.DESCARTADO,
          changeReason: `Descarte total de ${asset.quantity} unidades`,
          oldData: { quantity: asset.quantity },
          newData: { quantity: 0, disposalDate: disposalDate.toISOString() },
        },
      });

      return tx.asset.update({
        where: { id },
        data: {
          status: AssetStatus.DESCARTADO,
          isActive: false,
          disposalDate,
          quantity: 0,
          responsiblePersonId: null,
        },
      });
    });
  }

  async getStockMovements(id: number) {
    await this.findOne(id);

    return this.prisma.assetStockMovement.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        performedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async createStockMovement(
    assetId: number,
    dto: CreateAssetStockMovementDto,
    performedByUserId?: number,
  ) {
    const sourceIds = dto.sources?.map((source) => source.assignmentId) ?? [];
    if (new Set(sourceIds).size !== sourceIds.length) {
      throw new BadRequestException('No se puede repetir una asignación como origen');
    }

    return this.prisma.$transaction(
      async (tx: any) => {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException('Activo no encontrado');
        if (!asset.isActive) throw new BadRequestException('El activo no está disponible');

        const activeAssignments = await tx.assetAssignment.findMany({
          where: { assetId, status: AssignmentStatus.ACTIVE },
          include: {
            assignedToPerson: { select: { id: true, name: true } },
          },
        });

        const totalAssigned = activeAssignments.reduce(
          (total: number, assignment: any) => total + assignment.quantity,
          0,
        );
        const availableFreeQuantity = asset.quantity - totalAssigned;

        if (availableFreeQuantity < 0) {
          throw new BadRequestException(
            'La distribución actual supera la cantidad total del activo',
          );
        }

        if (dto.type === AssetStockMovementType.IN) {
          if ((dto.sources?.length ?? 0) > 0) {
            throw new BadRequestException('Una entrada no puede afectar asignaciones');
          }

          const newQuantity = asset.quantity + dto.quantity;
          await tx.asset.update({
            where: { id: assetId },
            data: { quantity: newQuantity },
          });

          const movement = await tx.assetStockMovement.create({
            data: {
              assetId,
              performedByUserId,
              type: dto.type,
              quantity: dto.quantity,
              freeQuantity: dto.quantity,
              previousQuantity: asset.quantity,
              newQuantity,
              reason: dto.reason,
              notes: dto.notes,
            },
            include: {
              performedByUser: { select: { id: true, name: true, email: true } },
            },
          });

          await tx.assetHistory.create({
            data: {
              assetId,
              changedByUserId: performedByUserId,
              eventType: 'STOCK_IN' as AssetHistoryEventType,
              oldData: { quantity: asset.quantity },
              newData: { quantity: newQuantity },
              changeReason: dto.reason,
              notes: dto.notes,
              source: 'stock_movement',
            },
          });

          return movement;
        }

        const sources = dto.sources ?? [];
        const sourceQuantity = sources.reduce((total, source) => total + source.quantity, 0);
        const freeQuantity = dto.freeQuantity ?? dto.quantity - sourceQuantity;

        if (freeQuantity + sourceQuantity !== dto.quantity) {
          throw new BadRequestException(
            'La suma del stock libre y las asignaciones debe coincidir con la cantidad de salida',
          );
        }
        if (freeQuantity > availableFreeQuantity) {
          throw new BadRequestException(
            `Solo hay ${availableFreeQuantity} unidades libres disponibles`,
          );
        }
        if (dto.quantity > asset.quantity) {
          throw new BadRequestException('La salida supera la cantidad total del activo');
        }

        const sourceBreakdown: Array<Record<string, unknown>> = [];
        for (const source of sources) {
          const assignment = activeAssignments.find((item: any) => item.id === source.assignmentId);
          if (!assignment) {
            throw new BadRequestException(
              `La asignación ${source.assignmentId} no existe o ya no está activa`,
            );
          }
          if (source.quantity > assignment.quantity) {
            throw new BadRequestException(
              `${assignment.assignedToPerson.name} solo tiene ${assignment.quantity} unidades asignadas`,
            );
          }

          const remainingQuantity = assignment.quantity - source.quantity;
          await tx.assetAssignment.update({
            where: { id: assignment.id },
            data:
              remainingQuantity === 0
                ? { status: AssignmentStatus.CANCELLED, returnDate: new Date() }
                : { quantity: remainingQuantity },
          });

          sourceBreakdown.push({
            assignmentId: assignment.id,
            personId: assignment.assignedToPerson.id,
            personName: assignment.assignedToPerson.name,
            assignmentType: assignment.type,
            quantity: source.quantity,
          });
        }

        const newQuantity = asset.quantity - dto.quantity;
        await tx.asset.update({
          where: { id: assetId },
          data: { quantity: newQuantity },
        });

        const movement = await tx.assetStockMovement.create({
          data: {
            assetId,
            performedByUserId,
            type: dto.type,
            quantity: dto.quantity,
            freeQuantity,
            previousQuantity: asset.quantity,
            newQuantity,
            reason: dto.reason,
            notes: dto.notes,
            sourceBreakdown: sourceBreakdown as any,
          },
          include: {
            performedByUser: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.assetHistory.create({
          data: {
            assetId,
            changedByUserId: performedByUserId,
            eventType: 'STOCK_OUT' as AssetHistoryEventType,
            oldData: { quantity: asset.quantity },
            newData: { quantity: newQuantity },
            changeReason: dto.reason,
            notes: dto.notes,
            source: 'stock_movement',
          },
        });

        return movement;
      },
      { isolationLevel: 'Serializable' as any },
    );
  }

  /**
   * Obtener historial de un activo
   */
  async getHistory(id: number) {
    await this.findOne(id);

    return this.prisma.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
