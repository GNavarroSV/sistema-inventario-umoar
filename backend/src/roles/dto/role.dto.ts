import { RoleType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsEnum(RoleType)
  type: RoleType;

  @IsString()
  @IsOptional()
  description?: string;
}
