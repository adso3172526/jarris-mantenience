import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../common/enums/permission.enum';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('permissions/list')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  listPermissions() {
    return ALL_PERMISSIONS.map(p => ({
      key: p,
      label: PERMISSION_LABELS[p],
    }));
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  findAll() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.profilesService.delete(id);
  }
}
