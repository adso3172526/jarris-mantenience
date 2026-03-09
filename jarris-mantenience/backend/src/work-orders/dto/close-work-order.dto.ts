import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AssetEventType } from '../../entities/asset-event.entity';

export class CloseWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  closedBy: string;

  @IsEnum(AssetEventType)
  eventType: AssetEventType;

  @IsOptional()
  @IsString()
  eventDescription?: string;
}
