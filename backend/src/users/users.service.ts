import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { RoleType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  private readonly principalAdminEmail = 'admin@umoar.edu.sv';
  private readonly reservedPrincipalRoleName = 'Administrador principal';

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            menus: {
              include: {
                menu: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            menus: {
              include: {
                menu: true,
              },
            },
          },
        },
      },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const name = createUserDto.name?.trim();
    const email = createUserDto.email?.trim().toLowerCase();
    const rawPassword = createUserDto.password?.trim();

    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    if (!email) {
      throw new BadRequestException('El email es obligatorio');
    }

    if (!rawPassword) {
      throw new BadRequestException('La contraseña es obligatoria');
    }

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const role = createUserDto.roleId
      ? await this.prisma.role.findUnique({
          where: { id: createUserDto.roleId },
        })
      : await this.prisma.role.findUnique({
          where: { type: RoleType.EMPLOYEE },
        });

    if (!role) {
      throw new BadRequestException('Rol por defecto no encontrado');
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: role.id,
      },
      include: {
        role: {
          include: {
            menus: {
              include: {
                menu: true,
              },
            },
          },
        },
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async updateRole(userId: number, roleId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.email === this.principalAdminEmail || user.role.name === this.reservedPrincipalRoleName) {
      throw new BadRequestException('El rol del administrador principal no se puede modificar.');
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.name === this.reservedPrincipalRoleName) {
      throw new BadRequestException('El rol de administrador principal no se puede asignar manualmente.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async updateStatus(userId: number, isActive: boolean, currentUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!isActive && currentUserId === userId) {
      throw new BadRequestException('No puedes inactivar tu propio usuario mientras tienes la sesión activa.');
    }

    if (!isActive && user.role.type === RoleType.ADMIN) {
      throw new BadRequestException('No se puede inactivar un usuario administrador.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async updatePassword(userId: number, password: string, currentUserId?: number) {
    const rawPassword = password?.trim();

    if (!rawPassword || rawPassword.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const currentUser = currentUserId
      ? await this.prisma.user.findUnique({ where: { id: currentUserId }, include: { role: true } })
      : null;

    const isOwnPasswordChange = currentUserId === userId;
    const isPrincipalAdmin =
      currentUser?.email === this.principalAdminEmail &&
      currentUser.role.name === this.reservedPrincipalRoleName;

    if (!currentUser || (!isOwnPasswordChange && !isPrincipalAdmin)) {
      throw new BadRequestException('Solo puedes cambiar tu propia contraseña. Para otros usuarios se requiere el administrador principal.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }
}
