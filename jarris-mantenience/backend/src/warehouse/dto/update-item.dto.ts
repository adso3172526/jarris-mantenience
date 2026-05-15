import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { UnitOfMeasure } from '../../entities/warehouse-item.entity';

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsEnum(UnitOfMeasure)
  @IsOptional()
  unitOfMeasure?: UnitOfMeasure;

  @IsString()
  @IsOptional()
  weightOrSize?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumStock?: number;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
