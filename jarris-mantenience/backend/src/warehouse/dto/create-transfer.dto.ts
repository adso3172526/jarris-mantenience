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

export class TransferLineDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateTransferDto {
  @IsUUID()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
