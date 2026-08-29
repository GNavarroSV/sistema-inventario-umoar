import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}
  private readonly reservedPrincipalRoleName = 'Administrador principal';

  // ============ ROLES ============

  async createRole(createRoleDto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException('El rol ya existe');
    }

    return this.prisma.role.create({
      data: createRoleDto,
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });
  }

  async getAllRoles() {
    return this.prisma.role.findMany({
      where: {
        name: {
          not: this.reservedPrincipalRoleName,
        },
      },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }
}
