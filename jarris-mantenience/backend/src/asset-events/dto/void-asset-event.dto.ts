import { IsNotEmpty, IsString } from 'class-validator';

export class VoidAssetEventDto {
  @IsString()
  @IsNotEmpty()
  voidedBy: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
