import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateUserRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;
}
