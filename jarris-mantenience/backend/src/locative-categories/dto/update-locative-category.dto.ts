import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLocativeCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
