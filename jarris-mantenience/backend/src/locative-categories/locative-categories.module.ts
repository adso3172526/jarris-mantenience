import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocativeCategoryEntity } from '../entities/locative-category.entity';
import { LocativeCategoriesController } from './locative-categories.controller';
import { LocativeCategoriesService } from './locative-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocativeCategoryEntity])],
  controllers: [LocativeCategoriesController],
  providers: [LocativeCategoriesService],
})
export class LocativeCategoriesModule {}
