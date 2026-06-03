import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto, UpdatePersonDto } from './dto';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async create(createPersonDto: CreatePersonDto) {
    const normalizedEmail = createPersonDto.email?.trim() || undefined;
    const normalizedDocumentNumber = createPersonDto.documentNumber?.trim() || undefined;

    if (normalizedEmail) {
      const existingEmail = await this.prisma.person.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        throw new BadRequestException('Ya existe una persona con ese correo');
      }
    }

    if (normalizedDocumentNumber) {
      const existingDocument = await this.prisma.person.findUnique({ where: { documentNumber: normalizedDocumentNumber } });
      if (existingDocument) {
        throw new BadRequestException('Ya existe una persona con ese documento');
      }
    }

    return this.prisma.person.create({
      data: {
        name: createPersonDto.name.trim(),
        email: normalizedEmail,
        documentNumber: normalizedDocumentNumber,
        phone: createPersonDto.phone?.trim() || undefined,
        isActive: createPersonDto.isActive ?? true,
      },
    });
  }

  findAll(isActive?: boolean) {
    return this.prisma.person.findMany({
      where: typeof isActive === 'boolean' ? { isActive } : undefined,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        documentNumber: true,
        phone: true,
        isActive: true,
      },
    });
  }

  async findOne(id: number) {
    const person = await this.prisma.person.findUnique({
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

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return person;
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    await this.findOne(id);

    const normalizedEmail = updatePersonDto.email?.trim();
    const normalizedDocumentNumber = updatePersonDto.documentNumber?.trim();

    if (normalizedEmail) {
      const existingEmail = await this.prisma.person.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail && existingEmail.id !== id) {
        throw new BadRequestException('Ya existe una persona con ese correo');
      }
    }

    if (normalizedDocumentNumber) {
      const existingDocument = await this.prisma.person.findUnique({ where: { documentNumber: normalizedDocumentNumber } });
      if (existingDocument && existingDocument.id !== id) {
        throw new BadRequestException('Ya existe una persona con ese documento');
      }
    }

    return this.prisma.person.update({
      where: { id },
      data: {
        ...updatePersonDto,
        name: updatePersonDto.name?.trim(),
        email: normalizedEmail === undefined ? undefined : normalizedEmail || null,
        documentNumber:
          normalizedDocumentNumber === undefined ? undefined : normalizedDocumentNumber || null,
        phone: updatePersonDto.phone?.trim() || undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const linkedAssets = await this.prisma.asset.count({
      where: { responsiblePersonId: id },
    });

    if (linkedAssets > 0) {
      throw new BadRequestException('No se puede eliminar la persona porque tiene activos asociados');
    }

    return this.prisma.person.delete({ where: { id } });
  }
}
