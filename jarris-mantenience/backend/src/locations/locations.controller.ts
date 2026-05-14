import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_UBICACIONES)
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_UBICACIONES, Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO)
  findAll(@Req() req: any) {
    const profileLocationIds = req.user?.profileLocationIds || [];
    return this.service.findAll(profileLocationIds);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_UBICACIONES)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_UBICACIONES)
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_UBICACIONES)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get(':id/expenses')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_UBICACIONES)
  async getLocationExpenses(@Param('id') id: string) {
    return this.service.getLocationExpenses(id);
  }
}
