import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocativeCategoryEntity } from '../entities/locative-category.entity';
import { WorkOrderEntity } from '../entities/work-order.entity';
import { LocativeCategoriesController } from './locative-categories.controller';
import { LocativeCategoriesService } from './locative-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocativeCategoryEntity, WorkOrderEntity])],
  controllers: [LocativeCategoriesController],
  providers: [LocativeCategoriesService],
})
export class LocativeCategoriesModule {}
