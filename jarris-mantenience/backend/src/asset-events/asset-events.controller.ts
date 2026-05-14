import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { AssetEventsService } from './asset-events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { EditTransferDto } from './dto/edit-transfer.dto';
import { VoidAssetEventDto } from './dto/void-asset-event.dto';

@Controller('asset-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetEventsController {
  constructor(private readonly assetEventsService: AssetEventsService) {}

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_EVENTOS, Permission.VER_ACTIVOS)
  async getAllEvents() {
    return this.assetEventsService.getAllEvents();
  }

  @Get('asset/:id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_EVENTOS, Permission.VER_ACTIVOS)
  async getEventsByAsset(@Param('id') assetId: string) {
    return this.assetEventsService.getEventsByAsset(assetId);
  }

  @Patch(':id/edit')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_TRASLADOS)
  async editTransfer(
    @Param('id') id: string,
    @Body() dto: EditTransferDto,
  ) {
    return this.assetEventsService.editTransfer(id, dto);
  }

  @Patch(':id/void')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_TRASLADOS)
  async voidTransfer(
    @Param('id') id: string,
    @Body() dto: VoidAssetEventDto,
  ) {
    return this.assetEventsService.voidTransfer(id, dto);
  }
}
