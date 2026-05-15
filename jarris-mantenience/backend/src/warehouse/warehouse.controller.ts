import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { StockEntryDto } from './dto/stock-entry.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ConsumeItemsDto } from './dto/consume-items.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  // ─── WAREHOUSES ────────────────────────────────────────

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_ALMACEN)
  create(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.VER_ALMACEN, Permission.EDITAR_OT, Permission.FINALIZAR_OT)
  findAll() {
    return this.service.findAllWarehouses();
  }

  @Get('items/low-stock')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_ALMACEN)
  findLowStockItems() {
    return this.service.findLowStockItems();
  }

  @Get('movements')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_ALMACEN)
  findMovements(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
    @Query('type') type?: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findMovements({
      warehouseId,
      itemId,
      type,
      dateFrom,
      dateTo,
    });
  }

  @Get('by-location/:locationId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_ALMACEN, Permission.EDITAR_OT)
  findByLocation(@Param('locationId') locationId: string) {
    return this.service.findWarehouseByLocation(locationId);
  }

  @Get('consumption/:workOrderId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.VER_ALMACEN, Permission.EDITAR_OT)
  getConsumption(@Param('workOrderId') workOrderId: string) {
    return this.service.getConsumption(workOrderId);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_ALMACEN)
  findOne(@Param('id') id: string) {
    return this.service.findWarehouseById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_ALMACEN)
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.service.updateWarehouse(id, dto);
  }

  // ─── ITEMS ─────────────────────────────────────────────

  @Post('items')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_ALMACEN)
  createItem(@Body() dto: CreateItemDto) {
    return this.service.createItem(dto);
  }

  @Get(':warehouseId/items')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_ALMACEN, Permission.EDITAR_OT, Permission.FINALIZAR_OT)
  findItems(@Param('warehouseId') warehouseId: string) {
    return this.service.findItemsByWarehouse(warehouseId);
  }

  @Get('items/:id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_ALMACEN)
  findItem(@Param('id') id: string) {
    return this.service.findItemById(id);
  }

  @Patch('items/:id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_ALMACEN)
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(id, dto);
  }

  // ─── STOCK ─────────────────────────────────────────────

  @Post('stock-entry')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.GESTIONAR_INVENTARIO)
  addStockEntry(@Body() dto: StockEntryDto) {
    return this.service.addStockEntry(dto);
  }

  // ─── TRANSFERS ─────────────────────────────────────────

  @Post('transfers')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.GESTIONAR_INVENTARIO)
  createTransfer(@Body() dto: CreateTransferDto) {
    return this.service.createTransfer(dto);
  }

  // ─── CONSUMPTION ───────────────────────────────────────

  @Post('consume')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.EDITAR_OT, Permission.FINALIZAR_OT)
  consume(@Body() dto: ConsumeItemsDto) {
    return this.service.consumeItems(dto);
  }

  @Put('consumption/:workOrderId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CERRAR_OT)
  updateConsumption(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: ConsumeItemsDto,
  ) {
    return this.service.updateConsumption(workOrderId, dto);
  }
}
