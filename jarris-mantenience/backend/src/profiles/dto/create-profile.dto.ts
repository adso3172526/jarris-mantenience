import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationIds?: string[];
}
