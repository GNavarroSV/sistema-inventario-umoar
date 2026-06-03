import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePersonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}