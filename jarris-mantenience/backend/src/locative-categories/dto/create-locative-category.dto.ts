import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLocativeCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
