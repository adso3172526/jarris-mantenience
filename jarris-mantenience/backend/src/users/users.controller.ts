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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // Crear usuario: ADMIN, JEFE, TECNICO
  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  // Ver todos: TODOS los roles
  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findAll() {
    return this.service.findAll();
  }

  // Listar técnicos y contratistas: TODOS (para asignar OT)
  @Get('technicians-contractors/list')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findTechniciansAndContractors() {
    return this.service.findTechniciansAndContractors();
  }

  // Ver uno: TODOS
  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // Editar usuario: ADMIN, JEFE, TECNICO
  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  // NUEVO: Resetear contraseña: ADMIN, JEFE
  @Patch(':id/reset-password')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  resetPassword(@Param('id') id: string, @Body('newPassword') newPassword: string) {
    return this.service.resetPassword(id, newPassword);
  }

  // Eliminar usuario: ADMIN, JEFE
  @Delete(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
