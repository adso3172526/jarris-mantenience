import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeAssetDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;
}