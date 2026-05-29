import { IsString, IsNotEmpty, IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ValidateIf((o) => o.costCenter !== null)
  @IsString()
  @IsOptional()
  costCenter?: string | null;
}
