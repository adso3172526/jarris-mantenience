import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LocationType } from '../../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LocationType)
  type: LocationType;
}
