import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsInt()
  operationalCenter?: number;

  @IsOptional()
  @IsInt()
  costCenter?: number;
}
