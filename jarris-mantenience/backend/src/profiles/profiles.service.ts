import { BadRequestException, Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ALL_PERMISSIONS, Permission } from '../common/enums/permission.enum';

const DEFAULT_PROFILES: Record<string, string[]> = {
  'JEFE DE MANTENIMIENTO': [
    Permission.VER_OT, Permission.VER_TODAS_OT, Permission.VER_TODAS_OT_LOCATIVO,
    Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO,
    Permission.EDITAR_OT, Permission.INICIAR_OT, Permission.FINALIZAR_OT,
    Permission.ASIGNAR_TECNICO, Permission.REASIGNAR_TECNICO,
    Permission.CAMBIAR_ACTIVO_OT, Permission.CAMBIAR_UBICACION_OT,
    Permission.ANULAR_OT, Permission.CERRAR_OT,
    Permission.VER_ACTIVOS, Permission.EDITAR_ACTIVOS,
    Permission.VER_EVENTOS, Permission.VER_BAJAS,
    Permission.VER_TRASLADOS, Permission.CREAR_TRASLADOS, Permission.EDITAR_TRASLADOS,
    Permission.VER_CATEGORIAS_ACTIVOS, Permission.EDITAR_CATEGORIAS_ACTIVOS,
    Permission.VER_CATEGORIAS_LOCATIVOS, Permission.EDITAR_CATEGORIAS_LOCATIVOS,
    Permission.VER_UBICACIONES, Permission.EDITAR_UBICACIONES,
    Permission.GENERAR_REPORTES, Permission.VER_DASHBOARD,
    Permission.VER_ALMACEN, Permission.EDITAR_ALMACEN, Permission.GESTIONAR_INVENTARIO,
  ],
  'TECNICO INTERNO': [
    Permission.VER_OT, Permission.EDITAR_OT, Permission.INICIAR_OT,
    Permission.FINALIZAR_OT, Permission.VER_ACTIVOS, Permission.VER_ALMACEN,
  ],
  'CONTRATISTA': [
    Permission.VER_OT, Permission.EDITAR_OT, Permission.INICIAR_OT,
    Permission.FINALIZAR_OT, Permission.VER_ALMACEN,
  ],
  'PUNTO DE VENTA': [
    Permission.VER_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO,
    Permission.VER_ACTIVOS,
  ],
  'ADMINISTRACION': [
    Permission.VER_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO,
    Permission.VER_ACTIVOS,
  ],
};

// Maps old role names to default profile names
export const ROLE_TO_PROFILE_NAME: Record<string, string> = {
  JEFE_MANTENIMIENTO: 'JEFE DE MANTENIMIENTO',
  TECNICO_INTERNO: 'TECNICO INTERNO',
  CONTRATISTA: 'CONTRATISTA',
  PDV: 'PUNTO DE VENTA',
  ADMINISTRACION: 'ADMINISTRACION',
};

@Injectable()
export class ProfilesService implements OnModuleInit {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(ProfileEntity)
    private readonly repo: Repository<ProfileEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProfiles();
  }

  async seedDefaultProfiles() {
    for (const [name, permissions] of Object.entries(DEFAULT_PROFILES)) {
      const exists = await this.repo.findOne({ where: { name } });
      if (!exists) {
        const profile = this.repo.create({ name, permissions, locationIds: [], active: true });
        await this.repo.save(profile);
        this.logger.log(`[seed] Perfil creado: ${name}`);
      }
    }
  }

  async findByName(name: string): Promise<ProfileEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async create(dto: CreateProfileDto) {
    const name = dto.name.trim().toUpperCase();

    const exists = await this.repo.findOne({ where: { name } });
    if (exists) {
      throw new BadRequestException(`Ya existe un perfil con el nombre "${name}"`);
    }

    const invalid = dto.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
    if (invalid.length > 0) {
      throw new BadRequestException(`Permisos inválidos: ${invalid.join(', ')}`);
    }

    const profile = this.repo.create({
      name,
      permissions: dto.permissions,
      locationIds: dto.locationIds || [],
      active: true,
    });

    return this.repo.save(profile);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return profile;
  }

  async update(id: string, dto: UpdateProfileDto) {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    if (dto.name !== undefined) {
      const name = dto.name.trim().toUpperCase();
      const duplicate = await this.repo.findOne({ where: { name } });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`Ya existe un perfil con el nombre "${name}"`);
      }
      profile.name = name;
    }

    if (dto.permissions !== undefined) {
      const invalid = dto.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
      if (invalid.length > 0) {
        throw new BadRequestException(`Permisos inválidos: ${invalid.join(', ')}`);
      }
      profile.permissions = dto.permissions;
    }

    if (dto.locationIds !== undefined) {
      profile.locationIds = dto.locationIds;
    }

    if (dto.active !== undefined) {
      profile.active = dto.active;
    }

    return this.repo.save(profile);
  }

  async delete(id: string) {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    await this.repo.remove(profile);
    return { message: 'Perfil eliminado exitosamente' };
  }
}
