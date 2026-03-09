import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationEntity } from '../entities/location.entity';
import { WorkOrderEntity } from '../entities/work-order.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationEntity, WorkOrderEntity])
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
