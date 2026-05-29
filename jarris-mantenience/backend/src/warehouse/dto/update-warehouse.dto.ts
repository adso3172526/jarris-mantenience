import { IsString, IsOptional, IsBoolean, IsUUID, ValidateIf } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ValidateIf((o) => o.costCenter !== null)
  @IsString()
  @IsOptional()
  costCenter?: string | null;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
