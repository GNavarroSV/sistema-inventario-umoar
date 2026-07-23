import { Type } from 'class-transformer';
import { AssignmentStatus, AssignmentType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAssignmentDto {
  @Type(() => Number)
  @IsInt()
  assetId: number;

  @Type(() => Number)
  @IsInt()
  assignedToPersonId: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assignedByUserId?: number;

  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assignedToPersonId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assignedByUserId?: number;

  @IsEnum(AssignmentType)
  @IsOptional()
  type?: AssignmentType;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MarkAssignmentReturnedDto {
  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @IsBoolean()
  @IsOptional()
  restorePreviousCustody?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

// --- Transfer quantity-based DTOs ---

export class TransferSourceDto {
  /** ID de la AssetAssignment activa de la que se toman unidades */
  @Type(() => Number)
  @IsInt()
  assignmentId: number;

  /** Cantidad a tomar de esta asignación */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateTransferDto {
  @Type(() => Number)
  @IsInt()
  assetId: number;

  /** Persona destino que recibe las unidades */
  @Type(() => Number)
  @IsInt()
  toPersonId: number;

  /** Usuario del sistema que autoriza la transferencia */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assignedByUserId?: number;

  /** Cantidad de unidades a transferir */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(AssignmentType)
  type: AssignmentType;

  /** Requerido si type === LOAN */
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** URL del documento de respaldo subido a Cloudinary */
  @IsString()
  @IsOptional()
  documentUrl?: string;

  /** Public ID de Cloudinary para poder eliminarlo luego */
  @IsString()
  @IsOptional()
  documentPublicId?: string;

  /**
   * Fuentes explícitas de las que se toman unidades.
   * Si no se especifican, se usa el pool libre (unidades no asignadas).
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferSourceDto)
  @IsOptional()
  sources?: TransferSourceDto[];
}
