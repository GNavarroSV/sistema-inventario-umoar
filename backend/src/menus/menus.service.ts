import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignMenuToRoleDto, CreateMenuDto, ReorderMenusDto, UpdateMenuDto } from './dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  private async ensureUniqueOrder(params: {
    menuId?: number;
    parentId?: number | null;
    order?: number | null;
  }) {
    const order = params.order ?? 0;

    const duplicateMenu = await this.prisma.menu.findFirst({
      where: {
        isActive: true,
        parent_id: params.parentId ?? null,
        order,
        ...(params.menuId ? { id: { not: params.menuId } } : {}),
      },
    });

    if (duplicateMenu) {
      throw new BadRequestException('Ya existe un menú con ese orden en el mismo nivel');
    }
  }

  async createMenu(createMenuDto: CreateMenuDto) {
    await this.ensureUniqueOrder({
      parentId: createMenuDto.parent_id,
      order: createMenuDto.order,
    });

    return this.prisma.menu.create({
      data: createMenuDto,
    });
  }

  async updateMenu(menuId: number, updateMenuDto: UpdateMenuDto) {
    const existingMenu = await this.prisma.menu.findUnique({ where: { id: menuId } });

    if (!existingMenu) {
      throw new NotFoundException('Menú no encontrado');
    }

    const nextParentId = updateMenuDto.parent_id === undefined ? existingMenu.parent_id : updateMenuDto.parent_id;
    const nextOrder = updateMenuDto.order === undefined ? existingMenu.order : updateMenuDto.order;

    await this.ensureUniqueOrder({
      menuId,
      parentId: nextParentId,
      order: nextOrder,
    });

    return this.prisma.menu.update({
      where: { id: menuId },
      data: {
        ...updateMenuDto,
        parent_id: updateMenuDto.parent_id === undefined ? undefined : updateMenuDto.parent_id,
      },
    });
  }

  async deleteMenu(menuId: number) {
    const existingMenu = await this.prisma.menu.findUnique({ where: { id: menuId } });

    if (!existingMenu) {
      throw new NotFoundException('Menú no encontrado');
    }

    return this.prisma.menu.update({
      where: { id: menuId },
      data: { isActive: false },
    });
  }

  async reorderMenus(dto: ReorderMenusDto) {
    await this.prisma.$transaction(
      dto.items.map(({ id, order }) =>
        this.prisma.menu.update({ where: { id }, data: { order } }),
      ),
    );
  }

  async getAllMenus() {
    return this.prisma.menu.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getMenusByRole(roleId: number) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return this.prisma.menu.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            roleId,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async assignMenusToRole(roleId: number, assignDto: AssignMenuToRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    await this.prisma.roleMenu.deleteMany({
      where: { roleId },
    });

    if (!assignDto.menuIds?.length) return [];

    return Promise.all(
      assignDto.menuIds.map((menuId) =>
        this.prisma.roleMenu.create({
          data: {
            roleId,
            menuId,
          },
        }),
      ),
    );
  }
}
