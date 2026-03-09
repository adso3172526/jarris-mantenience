import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetEventsController } from './asset-events.controller';
import { AssetEventsService } from './asset-events.service';
import { AssetEventEntity } from '../entities/asset-event.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetEventEntity, AssetEntity, LocationEntity])],
  controllers: [AssetEventsController],
  providers: [AssetEventsService],
  exports: [AssetEventsService],
})
export class AssetEventsModule {}
