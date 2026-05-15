import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { UnitOfMeasure } from '../../entities/warehouse-item.entity';

export class CreateItemDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsEnum(UnitOfMeasure)
  unitOfMeasure: UnitOfMeasure;

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

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialStock?: number;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  observations?: string;
}
