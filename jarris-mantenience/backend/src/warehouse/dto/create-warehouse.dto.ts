import { IsString, IsNotEmpty, IsUUID, IsOptional, IsInt, ValidateIf } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ValidateIf((o) => o.costCenter !== null)
  @IsInt()
  @IsOptional()
  costCenter?: number | null;
}
