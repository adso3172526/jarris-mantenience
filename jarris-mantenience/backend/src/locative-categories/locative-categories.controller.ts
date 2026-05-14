import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LocativeCategoriesService } from './locative-categories.service';
import { CreateLocativeCategoryDto } from './dto/create-locative-category.dto';
import { UpdateLocativeCategoryDto } from './dto/update-locative-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('locative-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocativeCategoriesController {
  constructor(private readonly service: LocativeCategoriesService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_CATEGORIAS_LOCATIVOS)
  create(@Body() dto: CreateLocativeCategoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_CATEGORIAS_LOCATIVOS, Permission.VER_ACTIVOS)
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_CATEGORIAS_LOCATIVOS, Permission.VER_ACTIVOS)
  findActive() {
    return this.service.findActive();
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_CATEGORIAS_LOCATIVOS, Permission.VER_ACTIVOS)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_CATEGORIAS_LOCATIVOS)
  update(@Param('id') id: string, @Body() dto: UpdateLocativeCategoryDto) {
    return this.service.update(id, dto);
  }
}
