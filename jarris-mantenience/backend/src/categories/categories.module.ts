import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { AssetEntity } from '../entities/asset.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, AssetEntity])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
