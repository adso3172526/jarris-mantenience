import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  assetId: string;

  @IsUUID()
  toLocationId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;
}
