import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../../entities/location.entity';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
