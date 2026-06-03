import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  async create(createCostCenterDto: CreateCostCenterDto) {
    const existing = await this.prisma.costCenter.findUnique({
      where: { code: createCostCenterDto.code },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un centro de costo con ese codigo');
    }

    return this.prisma.costCenter.create({
      data: {
        code: createCostCenterDto.code,
        name: createCostCenterDto.name,
        description: createCostCenterDto.description,
        isActive: createCostCenterDto.isActive ?? true,
      },
    });
  }

  async findAll(isActive?: boolean) {
    return this.prisma.costCenter.findMany({
      where: typeof isActive === 'boolean' ? { isActive } : undefined,
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const costCenter = await this.prisma.costCenter.findUnique({
      where: { id },
      include: {
        assets: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Centro de costo no encontrado');
    }

    return costCenter;
  }

  async update(id: number, updateCostCenterDto: UpdateCostCenterDto) {
    await this.findOne(id);

    if (updateCostCenterDto.code) {
      const existing = await this.prisma.costCenter.findUnique({
        where: { code: updateCostCenterDto.code },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Ya existe un centro de costo con ese codigo');
      }
    }

    return this.prisma.costCenter.update({
      where: { id },
      data: updateCostCenterDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const linkedAssets = await this.prisma.asset.count({
      where: { costCenterId: id, isActive: true },
    });

    if (linkedAssets > 0) {
      throw new BadRequestException(
        'No se puede eliminar el centro de costo porque tiene activos asociados',
      );
    }

    return this.prisma.costCenter.delete({ where: { id } });
  }
}
