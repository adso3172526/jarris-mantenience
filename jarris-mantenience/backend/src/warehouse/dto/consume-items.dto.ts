import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumeLineDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class ConsumeItemsDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  workOrderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ConsumeLineDto)
  lines: ConsumeLineDto[];

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
