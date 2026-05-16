import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, ValidateIf } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ValidateIf((o) => o.costCenter !== null)
  @IsInt()
  @IsOptional()
  costCenter?: number | null;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
