import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  @Matches(/^[A-Z0-9]+$/)
  codePrefix: string;
}
