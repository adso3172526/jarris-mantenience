import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.CREAR_USUARIOS)
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.CREAR_USUARIOS)
  findAll() {
    return this.service.findAll();
  }

  @Get('technicians-contractors/list')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO, Permission.VER_ACTIVOS)
  findTechniciansAndContractors() {
    return this.service.findTechniciansAndContractors();
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.CREAR_USUARIOS)
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.CREAR_USUARIOS)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/reset-password')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CAMBIAR_PASSWORD_USUARIO)
  resetPassword(@Param('id') id: string, @Body('newPassword') newPassword: string) {
    return this.service.resetPassword(id, newPassword);
  }

  @Delete(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CREAR_USUARIOS)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
