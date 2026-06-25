import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssetStatus, DepreciationType } from '@prisma/client';

export enum AssetStockMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  responsiblePersonId: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  costCenterId?: number;

  @IsDateString()
  @IsOptional()
  acquisitionDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitValue: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  purchaseOrder?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  warrantyMonths?: number;

  @IsEnum(DepreciationType)
  @IsOptional()
  depreciationType?: DepreciationType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  depreciationRate?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  depreciationMonths?: number;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;
}

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  responsiblePersonId?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  costCenterId?: number;

  @IsDateString()
  @IsOptional()
  acquisitionDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitValue?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  purchaseOrder?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  warrantyMonths?: number;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsEnum(DepreciationType)
  @IsOptional()
  depreciationType?: DepreciationType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  depreciationRate?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  depreciationMonths?: number;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;
}

export class AssetResponseDto {
  id: number;
  code: string;
  name: string;
  status: AssetStatus;
  location: string;
  quantity: number;
  unitValue: number;
  acquisitionDate?: Date | null;
  responsiblePerson: {
    id: number;
    name: string;
  };
}

export class DiscardAssetDto {
  @IsDateString()
  disposalDate: string;
}

export class StockMovementSourceDto {
  @Type(() => Number)
  @IsInt()
  assignmentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateAssetStockMovementDto {
  @IsEnum(AssetStockMovementType)
  type: AssetStockMovementType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  freeQuantity?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMovementSourceDto)
  @IsOptional()
  sources?: StockMovementSourceDto[];
}
