import { IsOptional, IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class EditTransferDto {
  @IsOptional()
  @IsUUID()
  toLocationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
