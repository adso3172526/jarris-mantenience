import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsString()
  operationalCenter?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;
}
