import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
