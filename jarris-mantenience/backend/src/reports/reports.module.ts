import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetEventEntity } from '../entities/asset-event.entity';
import { WorkOrderEntity } from '../entities/work-order.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetEventEntity,
      WorkOrderEntity,
      AssetEntity,
      LocationEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
