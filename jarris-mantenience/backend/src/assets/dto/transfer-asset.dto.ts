import { IsUUID, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class TransferAssetDto {
  @IsUUID()
  toLocationId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
