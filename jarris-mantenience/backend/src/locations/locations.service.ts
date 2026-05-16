import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationEntity } from '../entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { WorkOrderEntity, WorkOrderStatus, MaintenanceType } from '../entities/work-order.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly repo: Repository<LocationEntity>,
    @InjectRepository(WorkOrderEntity)
    private readonly workOrderRepo: Repository<WorkOrderEntity>,
  ) {}

  async create(dto: CreateLocationDto) {
    const normalizedName = dto.name.trim().toUpperCase();
    const existing = await this.repo
      .createQueryBuilder('l')
      .where('UPPER(l.name) = :name', { name: normalizedName })
      .getOne();
    if (existing) {
      throw new ConflictException(`Ya existe una ubicación con el nombre "${normalizedName}"`);
    }
    if (dto.operationalCenter != null) {
      const existingCO = await this.repo.findOne({ where: { operationalCenter: dto.operationalCenter } });
      if (existingCO) {
        throw new ConflictException(`Ya existe una ubicación con el Centro Operativo ${dto.operationalCenter}`);
      }
    }

    if (dto.costCenter != null) {
      const existingCC = await this.repo.findOne({ where: { costCenter: dto.costCenter } });
      if (existingCC) {
        throw new ConflictException(`Ya existe una ubicación con el Centro de Costos ${dto.costCenter}`);
      }
    }

    const entity = this.repo.create({
      name: normalizedName,
      type: dto.type,
      operationalCenter: dto.operationalCenter ?? null,
      costCenter: dto.costCenter ?? null,
      active: true,
    });
    return this.repo.save(entity);
  }

  findAll(profileLocationIds?: string[]) {
    if (profileLocationIds && profileLocationIds.length > 0) {
      return this.repo.find({
        where: { id: In(profileLocationIds) },
        order: { name: 'ASC' },
      });
    }
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Location not found');
    return item;
  }

  async update(id: string, dto: UpdateLocationDto) {
    const item = await this.findOne(id);
    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim().toUpperCase();
      const existing = await this.repo
        .createQueryBuilder('l')
        .where('UPPER(l.name) = :name', { name: normalizedName })
        .getOne();
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe una ubicación con el nombre "${normalizedName}"`);
      }
      item.name = normalizedName;
    }
    if (dto.type !== undefined) item.type = dto.type;

    if (dto.operationalCenter !== undefined) {
      if (dto.operationalCenter != null) {
        const existingCO = await this.repo.findOne({ where: { operationalCenter: dto.operationalCenter } });
        if (existingCO && existingCO.id !== id) {
          throw new ConflictException(`Ya existe una ubicación con el Centro Operativo ${dto.operationalCenter}`);
        }
      }
      item.operationalCenter = dto.operationalCenter ?? null;
    }

    if (dto.costCenter !== undefined) {
      if (dto.costCenter != null) {
        const existingCC = await this.repo.findOne({ where: { costCenter: dto.costCenter } });
        if (existingCC && existingCC.id !== id) {
          throw new ConflictException(`Ya existe una ubicación con el Centro de Costos ${dto.costCenter}`);
        }
      }
      item.costCenter = dto.costCenter ?? null;
    }

    if (dto.active !== undefined) item.active = dto.active;
    return this.repo.save(item);
  }

  async delete(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    
    if (!item) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    
    await this.repo.remove(item);
    
    return { 
      message: 'Ubicación eliminada exitosamente',
      deletedLocationId: id,
      deletedLocationName: item.name
    };
  }

  async getLocationExpenses(locationId: string) {
    const location = await this.repo.findOne({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const workOrders = await this.workOrderRepo.find({
      where: {
        location: { id: locationId },
        status: WorkOrderStatus.CERRADA,
        maintenanceType: MaintenanceType.LOCATIVO,
      },
      relations: ['location', 'locativeCategory'],
      order: { closedAt: 'DESC' },
    });

    return workOrders;
  }
}
