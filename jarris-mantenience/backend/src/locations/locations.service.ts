import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const entity = this.repo.create({
      name: dto.name.trim(),
      type: dto.type,
      active: true,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Location not found');
    return item;
  }

  async update(id: string, dto: UpdateLocationDto) {
    const item = await this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.type !== undefined) item.type = dto.type;
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
      relations: ['location'],
      order: { closedAt: 'DESC' },
    });

    return workOrders;
  }
}
