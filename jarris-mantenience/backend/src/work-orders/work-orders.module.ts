import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

import { WorkOrderEntity } from '../entities/work-order.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';
import { AssetEventEntity } from '../entities/asset-event.entity';

import { MailModule } from '../mail/mail.module'; // ✅
import { UserEntity } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkOrderEntity, AssetEntity, LocationEntity, AssetEventEntity,UserEntity,]),
    MailModule, // ✅ CLAVE
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
