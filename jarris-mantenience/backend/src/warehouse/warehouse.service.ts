import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { WarehouseEntity } from '../entities/warehouse.entity';
import { WarehouseItemEntity } from '../entities/warehouse-item.entity';
import {
  StockMovementEntity,
  StockMovementType,
} from '../entities/stock-movement.entity';
import { LocationEntity } from '../entities/location.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { StockEntryDto } from './dto/stock-entry.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ConsumeItemsDto } from './dto/consume-items.dto';
import { WorkOrderEntity } from '../entities/work-order.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(WarehouseItemEntity)
    private itemRepo: Repository<WarehouseItemEntity>,
    @InjectRepository(StockMovementEntity)
    private movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(LocationEntity)
    private locationRepo: Repository<LocationEntity>,
    private dataSource: DataSource,
  ) {}

  // ─── WAREHOUSES ────────────────────────────────────────

  async createWarehouse(dto: CreateWarehouseDto): Promise<WarehouseEntity> {
    const location = await this.locationRepo.findOne({
      where: { id: dto.locationId },
    });
    if (!location) throw new NotFoundException('Ubicación no encontrada');

    if (dto.costCenter != null) {
      const existingCC = await this.warehouseRepo.findOne({
        where: { costCenter: dto.costCenter },
      });
      if (existingCC) {
        throw new ConflictException(`Ya existe un almacén con el Centro de Costos ${dto.costCenter}`);
      }
    }

    const warehouse = this.warehouseRepo.create({
      name: dto.name.trim(),
      locationId: dto.locationId,
      costCenter: dto.costCenter ?? null,
    });
    return this.warehouseRepo.save(warehouse);
  }

  async findAllWarehouses(profileLocationIds?: string[]): Promise<WarehouseEntity[]> {
    const where: any = {};
    if (profileLocationIds && profileLocationIds.length > 0) {
      where.locationId = In(profileLocationIds);
    }
    return this.warehouseRepo.find({
      where,
      relations: ['location'],
      order: { name: 'ASC' },
    });
  }

  async findWarehouseById(id: string): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
      relations: ['location'],
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    return warehouse;
  }

  async findWarehouseByLocation(locationId: string): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { locationId },
      relations: ['location'],
    });
    if (!warehouse)
      throw new NotFoundException('No hay almacén para esta ubicación');
    return warehouse;
  }

  async updateWarehouse(
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseEntity> {
    const warehouse = await this.findWarehouseById(id);
    if (dto.name !== undefined) warehouse.name = dto.name.trim();
    if (dto.locationId !== undefined) {
      const location = await this.locationRepo.findOne({ where: { id: dto.locationId } });
      if (!location) throw new NotFoundException('Ubicación no encontrada');
      warehouse.location = location;
      warehouse.locationId = dto.locationId;
    }
    if (dto.costCenter !== undefined) {
      if (dto.costCenter != null) {
        const existingCC = await this.warehouseRepo.findOne({
          where: { costCenter: dto.costCenter },
        });
        if (existingCC && existingCC.id !== id) {
          throw new ConflictException(`Ya existe un almacén con el Centro de Costos ${dto.costCenter}`);
        }
      }
      warehouse.costCenter = dto.costCenter ?? null;
    }
    if (dto.active !== undefined) warehouse.active = dto.active;
    return this.warehouseRepo.save(warehouse);
  }

  // ─── ITEMS ─────────────────────────────────────────────

  async createItem(dto: CreateItemDto): Promise<WarehouseItemEntity> {
    await this.findWarehouseById(dto.warehouseId);

    const initialStock = dto.initialStock && dto.initialStock > 0 ? dto.initialStock : 0;

    const item = new WarehouseItemEntity();
    item.warehouseId = dto.warehouseId;
    item.name = dto.name.trim();
    item.brand = dto.brand?.trim() || undefined;
    item.unitOfMeasure = dto.unitOfMeasure;
    item.weightOrSize = dto.weightOrSize?.trim() || undefined;
    item.unitCost = dto.unitCost ?? 0;
    item.stock = initialStock;
    item.minimumStock = dto.minimumStock ?? 0;
    item.observations = dto.observations?.trim() || undefined;

    const savedItem = await this.itemRepo.save(item);

    // Create initial stock movement if there's initial stock
    if (initialStock > 0) {
      const movement = new StockMovementEntity();
      movement.type = StockMovementType.INGRESO;
      movement.warehouseId = dto.warehouseId;
      movement.itemId = savedItem.id;
      movement.quantity = initialStock;
      movement.unitCostAtTime = savedItem.unitCost;
      movement.totalCost = initialStock * savedItem.unitCost;
      movement.observation = 'Stock inicial';
      movement.createdBy = dto.createdBy || '';
      await this.movementRepo.save(movement);
    }

    return savedItem;
  }

  async findItemsByWarehouse(warehouseId: string): Promise<WarehouseItemEntity[]> {
    return this.itemRepo.find({
      where: { warehouseId },
      order: { name: 'ASC' },
    });
  }

  async findItemById(id: string): Promise<WarehouseItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['warehouse'],
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto): Promise<WarehouseItemEntity> {
    const item = await this.findItemById(id);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.brand !== undefined) item.brand = dto.brand?.trim() || undefined;
    if (dto.unitOfMeasure !== undefined) item.unitOfMeasure = dto.unitOfMeasure;
    if (dto.weightOrSize !== undefined) item.weightOrSize = dto.weightOrSize?.trim() || undefined;
    if (dto.unitCost !== undefined) item.unitCost = dto.unitCost;
    if (dto.minimumStock !== undefined) item.minimumStock = dto.minimumStock;
    if (dto.observations !== undefined) item.observations = dto.observations?.trim() || undefined;
    if (dto.active !== undefined) item.active = dto.active;
    return this.itemRepo.save(item);
  }

  async findLowStockItems(): Promise<WarehouseItemEntity[]> {
    return this.itemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.warehouse', 'warehouse')
      .where('item.active = true')
      .andWhere('item.stock < item.minimumStock')
      .andWhere('item.minimumStock > 0')
      .orderBy('warehouse.name', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .getMany();
  }

  // ─── STOCK ENTRY ───────────────────────────────────────

  async addStockEntry(dto: StockEntryDto): Promise<StockMovementEntity> {
    const item = await this.findItemById(dto.itemId);
    const entryCost = dto.unitCost ?? Number(item.unitCost);
    const currentStock = Number(item.stock);
    const currentCost = Number(item.unitCost);

    return this.dataSource.transaction(async (manager) => {
      const newStock = currentStock + dto.quantity;

      // Costo Promedio Ponderado:
      // ((stockActual * costoActual) + (cantidadIngreso * costoIngreso)) / nuevoStock
      const weightedAvgCost = newStock > 0
        ? ((currentStock * currentCost) + (dto.quantity * entryCost)) / newStock
        : entryCost;

      await manager.update(WarehouseItemEntity, item.id, {
        stock: newStock,
        unitCost: Math.round(weightedAvgCost * 100) / 100,
      });

      const movement = new StockMovementEntity();
      movement.type = StockMovementType.INGRESO;
      movement.warehouseId = item.warehouseId;
      movement.itemId = item.id;
      movement.quantity = dto.quantity;
      movement.unitCostAtTime = entryCost;
      movement.totalCost = dto.quantity * entryCost;
      movement.observation = dto.observation?.trim() || undefined;
      movement.createdBy = dto.createdBy;

      return manager.save(movement);
    });
  }

  // ─── TRANSFERS ─────────────────────────────────────────

  async createTransfer(dto: CreateTransferDto): Promise<{ transferId: string }> {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException(
        'El almacén origen y destino no pueden ser el mismo',
      );
    }

    await this.findWarehouseById(dto.sourceWarehouseId);
    await this.findWarehouseById(dto.destinationWarehouseId);

    const transferId = uuidv4();

    await this.dataSource.transaction(async (manager) => {
      for (const line of dto.lines) {
        const sourceItem = await manager.findOne(WarehouseItemEntity, {
          where: { id: line.itemId, warehouseId: dto.sourceWarehouseId },
        });
        if (!sourceItem) {
          throw new NotFoundException(
            `Item ${line.itemId} no encontrado en almacén origen`,
          );
        }
        if (Number(sourceItem.stock) < line.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${sourceItem.name}". Disponible: ${sourceItem.stock}`,
          );
        }

        const unitCost = Number(sourceItem.unitCost);

        // Decrement source stock
        await manager.update(WarehouseItemEntity, sourceItem.id, {
          stock: Number(sourceItem.stock) - line.quantity,
        });

        // TRASLADO_SALIDA movement
        const salidaMovement = new StockMovementEntity();
        salidaMovement.type = StockMovementType.TRASLADO_SALIDA;
        salidaMovement.warehouseId = dto.sourceWarehouseId;
        salidaMovement.itemId = sourceItem.id;
        salidaMovement.quantity = line.quantity;
        salidaMovement.unitCostAtTime = unitCost;
        salidaMovement.totalCost = line.quantity * unitCost;
        salidaMovement.transferId = transferId;
        salidaMovement.observation = dto.observation?.trim() || undefined;
        salidaMovement.createdBy = dto.createdBy;
        await manager.save(salidaMovement);

        // Find or create destination item
        let destItem = await manager.findOne(WarehouseItemEntity, {
          where: {
            warehouseId: dto.destinationWarehouseId,
            name: sourceItem.name,
          },
        });

        if (!destItem) {
          const newItem = new WarehouseItemEntity();
          newItem.warehouseId = dto.destinationWarehouseId;
          newItem.name = sourceItem.name;
          newItem.brand = sourceItem.brand;
          newItem.unitOfMeasure = sourceItem.unitOfMeasure;
          newItem.weightOrSize = sourceItem.weightOrSize;
          newItem.unitCost = sourceItem.unitCost;
          newItem.stock = 0;
          newItem.minimumStock = 0;
          destItem = await manager.save(newItem);
        }

        // Increment destination stock
        await manager.update(WarehouseItemEntity, destItem.id, {
          stock: Number(destItem.stock) + line.quantity,
        });

        // TRASLADO_ENTRADA movement
        const entradaMovement = new StockMovementEntity();
        entradaMovement.type = StockMovementType.TRASLADO_ENTRADA;
        entradaMovement.warehouseId = dto.destinationWarehouseId;
        entradaMovement.itemId = destItem.id;
        entradaMovement.quantity = line.quantity;
        entradaMovement.unitCostAtTime = unitCost;
        entradaMovement.totalCost = line.quantity * unitCost;
        entradaMovement.transferId = transferId;
        entradaMovement.observation = dto.observation?.trim() || undefined;
        entradaMovement.createdBy = dto.createdBy;
        await manager.save(entradaMovement);
      }
    });

    return { transferId };
  }

  // ─── CONSUMPTION ───────────────────────────────────────

  async consumeItems(dto: ConsumeItemsDto): Promise<StockMovementEntity[]> {
    await this.findWarehouseById(dto.warehouseId);

    return this.dataSource.transaction(async (manager) => {
      const movements: StockMovementEntity[] = [];

      for (const line of dto.lines) {
        const item = await manager.findOne(WarehouseItemEntity, {
          where: { id: line.itemId, warehouseId: dto.warehouseId },
        });
        if (!item) {
          throw new NotFoundException(`Item ${line.itemId} no encontrado`);
        }
        if (Number(item.stock) < line.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${item.name}". Disponible: ${item.stock}`,
          );
        }

        const unitCost = Number(item.unitCost);

        await manager.update(WarehouseItemEntity, item.id, {
          stock: Number(item.stock) - line.quantity,
        });

        const movement = new StockMovementEntity();
        movement.type = StockMovementType.CONSUMO;
        movement.warehouseId = dto.warehouseId;
        movement.itemId = item.id;
        movement.quantity = line.quantity;
        movement.unitCostAtTime = unitCost;
        movement.totalCost = line.quantity * unitCost;
        movement.workOrderId = dto.workOrderId;
        movement.observation = dto.observation?.trim() || undefined;
        movement.createdBy = dto.createdBy;

        const saved = await manager.save(movement);
        movements.push(saved);
      }

      return movements;
    });
  }

  async getConsumption(workOrderId: string): Promise<StockMovementEntity[]> {
    return this.movementRepo.find({
      where: {
        workOrderId,
        type: StockMovementType.CONSUMO,
      },
      relations: ['item', 'warehouse'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateConsumption(
    workOrderId: string,
    dto: ConsumeItemsDto,
  ): Promise<StockMovementEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      // 0. Get previous material cost to recalculate work order cost
      const prevCostResult = await manager
        .createQueryBuilder(StockMovementEntity, 'm')
        .select('COALESCE(SUM(m.totalCost), 0)', 'total')
        .where('m.workOrderId = :workOrderId', { workOrderId })
        .andWhere('m.type = :type', { type: StockMovementType.CONSUMO })
        .getRawOne();
      const prevMaterialsCost = parseFloat(prevCostResult?.total || '0');

      // 1. Revert previous consumption movements
      const previousMovements = await manager.find(StockMovementEntity, {
        where: {
          workOrderId,
          type: StockMovementType.CONSUMO,
        },
      });

      for (const mov of previousMovements) {
        const item = await manager.findOne(WarehouseItemEntity, {
          where: { id: mov.itemId },
        });
        if (item) {
          await manager.update(WarehouseItemEntity, item.id, {
            stock: Number(item.stock) + Number(mov.quantity),
          });
        }
        await manager.remove(StockMovementEntity, mov);
      }

      // 2. Create new consumption movements
      let newMaterialsCost = 0;
      const movements: StockMovementEntity[] = [];

      if (dto.lines && dto.lines.length > 0) {
        for (const line of dto.lines) {
          const item = await manager.findOne(WarehouseItemEntity, {
            where: { id: line.itemId, warehouseId: dto.warehouseId },
          });
          if (!item) {
            throw new NotFoundException(`Item ${line.itemId} no encontrado`);
          }
          if (Number(item.stock) < line.quantity) {
            throw new BadRequestException(
              `Stock insuficiente para "${item.name}". Disponible: ${item.stock}`,
            );
          }

          const unitCost = Number(item.unitCost);
          const lineCost = line.quantity * unitCost;
          newMaterialsCost += lineCost;

          await manager.update(WarehouseItemEntity, item.id, {
            stock: Number(item.stock) - line.quantity,
          });

          const movement = new StockMovementEntity();
          movement.type = StockMovementType.CONSUMO;
          movement.warehouseId = dto.warehouseId;
          movement.itemId = item.id;
          movement.quantity = line.quantity;
          movement.unitCostAtTime = unitCost;
          movement.totalCost = lineCost;
          movement.workOrderId = workOrderId;
          movement.observation = dto.observation?.trim() || undefined;
          movement.createdBy = dto.createdBy;

          const saved = await manager.save(movement);
          movements.push(saved);
        }
      }

      // 3. Update work order materialsCost
      const wo = await manager.findOne(WorkOrderEntity, { where: { id: workOrderId } });
      if (wo) {
        wo.materialsCost = newMaterialsCost;
        await manager.save(wo);
      }

      return movements;
    });
  }

  // ─── MOVEMENTS (Kardex) ────────────────────────────────

  async findMovements(filters: {
    warehouseId?: string;
    itemId?: string;
    type?: StockMovementType;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StockMovementEntity[]> {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.item', 'item')
      .leftJoinAndSelect('m.warehouse', 'warehouse')
      .leftJoinAndSelect('warehouse.location', 'location')
      .leftJoinAndSelect('m.workOrder', 'workOrder');

    if (filters.warehouseId) {
      qb.andWhere('m.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }
    if (filters.itemId) {
      qb.andWhere('m.itemId = :itemId', { itemId: filters.itemId });
    }
    if (filters.type) {
      qb.andWhere('m.type = :type', { type: filters.type });
    }
    if (filters.dateFrom) {
      qb.andWhere('m.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('m.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('m.createdAt', 'DESC');
    return qb.getMany();
  }

  // ─── CONSUMPTION COST SUM ──────────────────────────────

  async getConsumptionTotalCost(workOrderId: string): Promise<number> {
    const result = await this.movementRepo
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.totalCost), 0)', 'total')
      .where('m.workOrderId = :workOrderId', { workOrderId })
      .andWhere('m.type = :type', { type: StockMovementType.CONSUMO })
      .getRawOne();
    return parseFloat(result.total);
  }
}
