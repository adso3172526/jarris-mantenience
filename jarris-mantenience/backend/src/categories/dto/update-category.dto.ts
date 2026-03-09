import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9]+$/)
  codePrefix?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
