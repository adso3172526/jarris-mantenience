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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // Crear categoría: SOLO ADMIN y JEFE
  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  // Ver todas: TODOS los roles
  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  findAll() {
    return this.service.findAll();
  }

  // Ver una: TODOS
  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Editar: SOLO ADMIN y JEFE
  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  // Eliminar: SOLO ADMIN y JEFE
  @Delete(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
