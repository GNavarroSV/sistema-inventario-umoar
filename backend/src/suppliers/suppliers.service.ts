import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    if (createSupplierDto.taxId) {
      const existing = await this.prisma.supplier.findUnique({
        where: { taxId: createSupplierDto.taxId },
      });

      if (existing) {
        throw new BadRequestException('Ya existe un proveedor con ese RUC/NIT');
      }
    }

    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        isActive: createSupplierDto.isActive ?? true,
      },
    });
  }

  async findAll(isActive?: boolean) {
    return this.prisma.supplier.findMany({
      where: typeof isActive === 'boolean' ? { isActive } : undefined,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
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

    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);

    if (updateSupplierDto.taxId) {
      const existing = await this.prisma.supplier.findUnique({
        where: { taxId: updateSupplierDto.taxId },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Ya existe un proveedor con ese RUC/NIT');
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const linkedAssets = await this.prisma.asset.count({
      where: { supplierId: id, isActive: true },
    });

    if (linkedAssets > 0) {
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque tiene activos asociados',
      );
    }

    return this.prisma.supplier.delete({ where: { id } });
  }
}
