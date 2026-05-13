import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../../entities/location.entity';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsInt()
  operationalCenter?: number;

  @IsOptional()
  @IsInt()
  costCenter?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
