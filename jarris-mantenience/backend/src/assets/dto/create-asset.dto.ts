import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssetStatus } from '../../entities/asset.entity';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
