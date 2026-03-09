import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

import { AssetEntity, AssetStatus } from '../entities/asset.entity';
import { CategoryEntity } from '../entities/category.entity';
import { LocationEntity } from '../entities/location.entity';
import { AssetEventEntity, AssetEventType } from '../entities/asset-event.entity';
import { WorkOrderEntity, WorkOrderStatus, MaintenanceType } from '../entities/work-order.entity';

import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepo: Repository<AssetEntity>,

    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,

    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,

    @InjectRepository(AssetEventEntity)
    private readonly eventRepo: Repository<AssetEventEntity>,

    @InjectRepository(WorkOrderEntity)
    private readonly workOrderRepo: Repository<WorkOrderEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAssetDto) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    const location = await this.locationRepo.findOne({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundException('Location not found');

    return this.dataSource.transaction(async (manager) => {
      const seq = category.nextSequence;
      const code = `EQ-${category.codePrefix}-${String(seq).padStart(4, '0')}`;

      category.nextSequence += 1;
      await manager.save(category);

      const qrData = JSON.stringify({
        code,
        id: '',
        type: 'asset',
      });
      
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });

      const asset = this.assetRepo.create({
        code,
        qrCode,
        description: dto.description,
        category,
        location,
        brand: dto.brand,
        reference: dto.reference,
        serial: dto.serial,
        value: dto.value ?? 0,
        status: dto.status ?? AssetStatus.ACTIVO,
      });

      const saved = await manager.save(AssetEntity, asset);

      const finalQrData = JSON.stringify({
        code: saved.code,
        id: saved.id,
        type: 'asset',
      });
      
      saved.qrCode = await QRCode.toDataURL(finalQrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });

      return manager.save(AssetEntity, saved);
    });
  }

  findAll() {
    return this.assetRepo.find({
      relations: ['category', 'location'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['category', 'location'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async findByLocation(locationId: string) {
    return this.assetRepo.find({
      where: { location: { id: locationId } },
      relations: ['category', 'location'],
      order: { code: 'ASC' },
    });
  }

  async findByCode(code: string) {
    const asset = await this.assetRepo.findOne({
      where: { code },
      relations: ['category', 'location'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    const asset = await this.findOne(id);

    if (dto.description !== undefined) asset.description = dto.description;
    if (dto.brand !== undefined) asset.brand = dto.brand;
    if (dto.reference !== undefined) asset.reference = dto.reference;
    if (dto.serial !== undefined) asset.serial = dto.serial;
    if (dto.value !== undefined) asset.value = dto.value;
    if (dto.status !== undefined) asset.status = dto.status;

    let newCategory: CategoryEntity | null = null;
    if (dto.categoryId && dto.categoryId !== asset.category?.id) {
      newCategory = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!newCategory) throw new NotFoundException('Category not found');
    }

    if (dto.locationId && dto.locationId !== asset.location?.id) {
      const newLocation = await this.locationRepo.findOne({ where: { id: dto.locationId } });
      if (!newLocation) throw new NotFoundException('Location not found');
      asset.location = newLocation;
    }

    if (newCategory) {
      return this.dataSource.transaction(async (manager) => {
        const seq = newCategory.nextSequence;
        const newCode = `EQ-${newCategory.codePrefix}-${String(seq).padStart(4, '0')}`;

        newCategory.nextSequence += 1;
        await manager.save(newCategory);

        asset.code = newCode;
        asset.category = newCategory;

        const qrData = JSON.stringify({
          code: newCode,
          id: asset.id,
          type: 'asset',
        });

        asset.qrCode = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 300,
        });

        return manager.save(asset);
      });
    }

    return this.assetRepo.save(asset);
  }

  async deactivate(id: string, dto: { createdBy?: string; description?: string }) {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
      if (asset.status === AssetStatus.BAJA) {
        throw new BadRequestException('El activo ya se encuentra dado de baja');
      }

      asset.status = AssetStatus.BAJA;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.BAJA,
        description: dto.description || 'Activo dado de baja',
        cost: 0,
        active: true,
        createdBy: dto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async reactivate(id: string, dto: { createdBy?: string; description?: string }) {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
      if (asset.status !== AssetStatus.BAJA) {
        throw new BadRequestException('Solo se pueden reactivar activos en estado BAJA');
      }

      asset.status = AssetStatus.ACTIVO;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.REACTIVACION,
        description: dto.description || 'Activo reactivado',
        cost: 0,
        active: true,
        createdBy: dto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async transfer(id: string, transferDto: TransferAssetDto): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) {
        throw new NotFoundException(`Asset with ID ${id} not found`);
      }

      const fromLocation = asset.location;

      const toLocation = await manager.findOne(LocationEntity, {
        where: { id: transferDto.toLocationId },
      });

      if (!toLocation) {
        throw new NotFoundException(
          `Location with ID ${transferDto.toLocationId} not found`,
        );
      }

      asset.location = toLocation;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.TRASLADO,
        description: transferDto.description || `Transferido de ${fromLocation.name} a ${toLocation.name}`,
        fromLocation,
        toLocation,
        cost: transferDto.cost || 0,
        active: true,
        createdBy: transferDto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async getQRCode(id: string): Promise<string> {
    const asset = await this.findOne(id);
    if (!asset.qrCode) {
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

      await this.assetRepo.save(asset);
    }

    return asset.qrCode;
  }

  async addPhotos(assetId: string, files: Express.Multer.File[]) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Activo no encontrado');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No se enviaron archivos');
    }

    if (!asset.photos) {
      asset.photos = [];
    }

    if (asset.photos.length + files.length > 5) {
      throw new BadRequestException(
        `El activo puede tener máximo 5 fotos. Actualmente tiene ${asset.photos.length}.`
      );
    }

    const newPhotos = files.map(file => `/uploads/asset-photos/${file.filename}`);
    asset.photos = [...asset.photos, ...newPhotos];

    await this.assetRepo.save(asset);

    return {
      message: 'Fotos subidas exitosamente',
      photos: asset.photos,
      totalPhotos: asset.photos.length,
    };
  }

  async removePhoto(assetId: string, photoIndex: number) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Activo no encontrado');
    }

    if (!asset.photos || asset.photos.length === 0) {
      throw new BadRequestException('Este activo no tiene fotos');
    }

    if (photoIndex < 0 || photoIndex >= asset.photos.length) {
      throw new BadRequestException('Índice de foto inválido');
    }

    const photoPath = asset.photos[photoIndex];
    const fullPath = path.join(process.cwd(), photoPath.replace('/uploads/', 'uploads/'));

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
    }

    asset.photos.splice(photoIndex, 1);
    await this.assetRepo.save(asset);

    return {
      message: 'Foto eliminada exitosamente',
      photos: asset.photos,
      totalPhotos: asset.photos.length,
    };
  }

  async getLocationExpenses(assetId: string) {
    const asset = await this.assetRepo.findOne({
      where: { id: assetId },
      relations: ['location'],
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const workOrders = await this.workOrderRepo.find({
      where: {
        location: { id: asset.location.id },
        status: WorkOrderStatus.CERRADA,
        maintenanceType: MaintenanceType.LOCATIVO,
      },
      relations: ['location'],
      order: { closedAt: 'DESC' },
    });

    return workOrders;
  }
}
