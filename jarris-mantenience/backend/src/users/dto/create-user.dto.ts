import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsArray()
  roles?: string[];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsArray()
  locationIds?: string[];

  @IsOptional()
  @IsString()
  profileId?: string;
}
