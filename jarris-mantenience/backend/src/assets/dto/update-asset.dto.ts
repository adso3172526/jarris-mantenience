import { IsOptional, IsString, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { AssetStatus } from '../../entities/asset.entity';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

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
