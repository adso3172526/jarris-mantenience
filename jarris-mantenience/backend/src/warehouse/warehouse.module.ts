import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseEntity } from '../entities/warehouse.entity';
import { WarehouseItemEntity } from '../entities/warehouse-item.entity';
import { StockMovementEntity } from '../entities/stock-movement.entity';
import { LocationEntity } from '../entities/location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseEntity,
      WarehouseItemEntity,
      StockMovementEntity,
      LocationEntity,
    ]),
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
