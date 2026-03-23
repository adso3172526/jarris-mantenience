import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AssetEventEntity, AssetEventType } from '../entities/asset-event.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';
import { EditTransferDto } from './dto/edit-transfer.dto';
import { VoidAssetEventDto } from './dto/void-asset-event.dto';

@Injectable()
export class AssetEventsService {
  constructor(
    @InjectRepository(AssetEventEntity)
    private assetEventRepository: Repository<AssetEventEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
    @InjectRepository(LocationEntity)
    private locationRepository: Repository<LocationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getEventsByAsset(assetId: string): Promise<AssetEventEntity[]> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    return this.assetEventRepository.find({
      where: { asset: { id: assetId }, active: true },
      relations: ['asset', 'asset.location', 'fromLocation', 'toLocation'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllEvents(): Promise<AssetEventEntity[]> {
    return this.assetEventRepository.find({
      where: { active: true },
      relations: ['asset', 'asset.location', 'fromLocation', 'toLocation', 'workOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  async editTransfer(eventId: string, dto: EditTransferDto) {
    return this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(AssetEventEntity, {
        where: { id: eventId },
        relations: ['asset', 'asset.location', 'fromLocation', 'toLocation'],
      });

      if (!event) throw new NotFoundException('Evento no encontrado');
      if (event.type !== AssetEventType.TRASLADO) {
        throw new BadRequestException('Solo se pueden editar eventos de tipo TRASLADO');
      }
      if (!event.active) {
        throw new BadRequestException('No se puede editar un evento anulado');
      }

      const oldToLocationId = event.toLocation?.id;

      // Cambio de destino
      if (dto.toLocationId && dto.toLocationId !== oldToLocationId) {
        const newLocation = await manager.findOne(LocationEntity, {
          where: { id: dto.toLocationId },
        });
        if (!newLocation) throw new NotFoundException('Ubicación destino no encontrada');

        event.toLocation = newLocation;

        // Actualizar ubicación del activo si aún está en el destino anterior
        const asset = await manager.findOne(AssetEntity, {
          where: { id: event.asset.id },
          relations: ['location'],
        });
        if (asset && asset.location?.id === oldToLocationId) {
          asset.location = newLocation;
          await manager.save(AssetEntity, asset);
        }
      }

      // Cambio de descripción
      if (dto.description !== undefined && dto.description !== event.description) {
        event.description = dto.description;
      }

      // Cambio de costo
      if (dto.cost !== undefined && Number(dto.cost) !== Number(event.cost)) {
        event.cost = dto.cost;
      }

      await manager.save(AssetEventEntity, event);

      // Recargar con relaciones completas para la respuesta
      const reloaded = await manager.findOne(AssetEventEntity, {
        where: { id: eventId },
        relations: ['asset', 'asset.location', 'fromLocation', 'toLocation'],
      });
      return reloaded;
    });
  }

  async voidTransfer(eventId: string, dto: VoidAssetEventDto) {
    return this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(AssetEventEntity, {
        where: { id: eventId },
        relations: ['asset', 'asset.location', 'fromLocation', 'toLocation'],
      });

      if (!event) throw new NotFoundException('Evento no encontrado');
      if (event.type !== AssetEventType.TRASLADO) {
        throw new BadRequestException('Solo se pueden anular eventos de tipo TRASLADO');
      }
      if (!event.active) {
        throw new BadRequestException('Este evento ya fue anulado');
      }

      // Marcar como anulado
      event.active = false;
      event.voidedAt = new Date();
      event.voidedBy = dto.voidedBy;
      event.voidReason = dto.reason;

      await manager.save(AssetEventEntity, event);

      // Revertir ubicación del activo a origen
      if (event.fromLocation) {
        const asset = await manager.findOne(AssetEntity, {
          where: { id: event.asset.id },
          relations: ['location'],
        });
        if (asset) {
          asset.location = event.fromLocation;
          await manager.save(AssetEntity, asset);
        }
      }

      return { ok: true, event };
    });
  }
}
