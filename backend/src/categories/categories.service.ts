import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una categoría con ese nombre');
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        isActive: createCategoryDto.isActive ?? true,
      },
    });
  }

  findAll(isActive?: boolean) {
    return this.prisma.category.findMany({
      where: typeof isActive === 'boolean' ? { isActive } : undefined,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existing && existing.id !== category.id) {
        throw new BadRequestException('Ya existe una categoría con ese nombre');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    const linkedAssets = await this.prisma.asset.count({
      where: { categoryId: category.id, isActive: true },
    });

    if (linkedAssets > 0) {
      throw new BadRequestException('No se puede eliminar la categoría porque tiene activos asociados');
    }

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
