import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetEntity } from '../entities/asset.entity';
import { CategoryEntity } from '../entities/category.entity';
import { LocationEntity } from '../entities/location.entity';
import { AssetEventEntity } from '../entities/asset-event.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { WorkOrderEntity } from '../entities/work-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetEntity,
      CategoryEntity,
      LocationEntity,
      AssetEventEntity,
	  WorkOrderEntity,
    ]),
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})

export class AssetsModule {}
