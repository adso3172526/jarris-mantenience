import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { CategoryEntity } from '../entities/category.entity';
import { AssetEntity } from '../entities/asset.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepo: Repository<AssetEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCategoryDto) {
    const entity = this.repo.create({
      name: dto.name.trim(),
      codePrefix: dto.codePrefix.trim().toUpperCase(),
      nextSequence: 1,
      active: true,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Category not found');
    return item;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const item = await this.findOne(id);
    const oldPrefix = item.codePrefix;

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.codePrefix !== undefined) item.codePrefix = dto.codePrefix.trim().toUpperCase();
    if (dto.active !== undefined) item.active = dto.active;

    const prefixChanged = dto.codePrefix !== undefined && item.codePrefix !== oldPrefix;
    return this.dataSource.transaction(async (manager) => {
      const savedCategory = await manager.save(CategoryEntity, item);
      let updatedAssets = 0;

      if (prefixChanged) {
        const assets = await manager.find(AssetEntity, {
          where: { category: { id: id } },
        });

        for (const asset of assets) {
          // Extraer el número de secuencia del código actual (última parte después del último guión)
          const parts = asset.code.split('-');
          const sequence = parts[parts.length - 1];
          asset.code = `EQ-${savedCategory.codePrefix}-${sequence}`;

          const qrData = JSON.stringify({
            code: asset.code,
            id: asset.id,
            type: 'asset',
          });

          asset.qrCode = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
          });

          await manager.save(AssetEntity, asset);
        }

        updatedAssets = assets.length;
      }

      return { ...savedCategory, updatedAssets };
    });
  }

  async delete(id: string) {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Categoría no encontrada');
    }

    await this.repo.remove(item);

    return {
      message: 'Categoría eliminada exitosamente',
      deletedCategoryId: id,
      deletedCategoryName: item.name
    };
  }
}
