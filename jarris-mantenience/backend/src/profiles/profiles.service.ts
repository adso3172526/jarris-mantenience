import { BadRequestException, Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';
import { ProfilePermissionEntity } from '../entities/profile-permission.entity';
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
    Permission.VER_ACTIVOS, Permission.VER_HISTORIAL_ACTIVO,
    Permission.EDITAR_ACTIVOS, Permission.VER_EVENTOS, Permission.VER_BAJAS,
    Permission.VER_TRASLADOS, Permission.CREAR_TRASLADOS, Permission.EDITAR_TRASLADOS,
    Permission.VER_CATEGORIAS_ACTIVOS, Permission.EDITAR_CATEGORIAS_ACTIVOS,
    Permission.VER_CATEGORIAS_LOCATIVOS, Permission.EDITAR_CATEGORIAS_LOCATIVOS,
    Permission.VER_UBICACIONES, Permission.EDITAR_UBICACIONES,
    Permission.GENERAR_REPORTES, Permission.VER_DASHBOARD,
    Permission.VER_TODOS_ALMACENES,
    Permission.VER_MOVIMIENTOS_ALMACEN, Permission.VER_ALERTAS_ALMACEN,
    Permission.EDITAR_ALMACEN, Permission.EDITAR_ITEMS_ALMACEN, Permission.INGRESAR_STOCK,
    Permission.VER_STOCK, Permission.EDITAR_STOCK,
    Permission.VER_TRASLADOS_ALMACEN, Permission.CREAR_TRASLADOS_ALMACEN,
    Permission.VER_SOLICITUDES, Permission.VER_ORDENES_CERRADAS,
    Permission.EDITAR_SOLICITUD, Permission.CERRAR_SOLICITUD, Permission.RECHAZAR_SOLICITUD,
    Permission.EDITAR_OT_CERRADA,
    Permission.CONSUMIR_ALMACEN_OT, Permission.EDITAR_CONSUMO_ALMACEN_OT,
    Permission.CREAR_USUARIOS,
    Permission.VER_PERFILES, Permission.CREAR_PERFILES, Permission.EDITAR_PERFILES,
  ],
  'TECNICO INTERNO': [
    Permission.VER_OT, Permission.EDITAR_OT, Permission.INICIAR_OT,
    Permission.FINALIZAR_OT, Permission.VER_ACTIVOS, Permission.VER_TODOS_ALMACENES,
    Permission.VER_SOLICITUDES, Permission.VER_ORDENES_CERRADAS,
  ],
  'CONTRATISTA': [
    Permission.VER_OT, Permission.EDITAR_OT, Permission.INICIAR_OT,
    Permission.FINALIZAR_OT, Permission.VER_TODOS_ALMACENES,
    Permission.VER_SOLICITUDES, Permission.VER_ORDENES_CERRADAS,
  ],
  'PUNTO DE VENTA': [
    Permission.VER_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO,
    Permission.VER_ACTIVOS,
    Permission.VER_SOLICITUDES, Permission.VER_ORDENES_CERRADAS,
  ],
  'ADMINISTRACION': [
    Permission.VER_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO,
    Permission.VER_ACTIVOS,
    Permission.VER_SOLICITUDES, Permission.VER_ORDENES_CERRADAS,
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
    @InjectRepository(ProfilePermissionEntity)
    private readonly permRepo: Repository<ProfilePermissionEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProfiles();
  }

  async seedDefaultProfiles() {
    for (const [name, permissions] of Object.entries(DEFAULT_PROFILES)) {
      let profile = await this.repo.findOne({ where: { name } });
      if (!profile) {
        const code = await this.generateNextCode();
        profile = this.repo.create({ code, name, active: true });
        profile = await this.repo.save(profile);
        // Insert permissions
        await this.syncPermissions(profile.id, permissions);
        this.logger.log(`[seed] Perfil creado: ${code} - ${name}`);
      }
    }

    // Assign codes to all existing profiles without one
    const withoutCode = await this.repo
      .createQueryBuilder('p')
      .where('p.code IS NULL OR p.code = :empty', { empty: '' })
      .orderBy('p.createdAt', 'ASC')
      .getMany();

    for (const profile of withoutCode) {
      profile.code = await this.generateNextCode();
      await this.repo.save(profile);
      this.logger.log(`[seed] Código asignado: ${profile.code} - ${profile.name}`);
    }
  }

  private async generateNextCode(): Promise<string> {
    const profiles = await this.repo.find({ select: ['code'] });
    const numbers = profiles
      .map(p => parseInt(p.code, 10))
      .filter(n => !isNaN(n));
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return next.toString().padStart(2, '0');
  }

  private async syncPermissions(profileId: string, permissions: string[]) {
    await this.permRepo.delete({ profileId });
    if (permissions.length > 0) {
      const entities = permissions.map(permission =>
        this.permRepo.create({ profileId, permission }),
      );
      await this.permRepo.save(entities);
    }
  }

  /** Insert a single permission (used by migration, ignores duplicates) */
  async addPermissionRaw(profileId: string, permission: string) {
    const exists = await this.permRepo.findOne({ where: { profileId, permission } });
    if (!exists) {
      await this.permRepo.save(this.permRepo.create({ profileId, permission }));
    }
  }

  // Helper to get permissions as string array
  getPermissions(profile: ProfileEntity): string[] {
    return (profile.profilePermissions || []).map(pp => pp.permission);
  }

  async findByName(name: string): Promise<ProfileEntity | null> {
    return this.repo.findOne({
      where: { name },
      relations: ['profilePermissions'],
    });
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

    const code = await this.generateNextCode();
    const profile = this.repo.create({ code, name, active: true });
    const saved = await this.repo.save(profile);

    await this.syncPermissions(saved.id, dto.permissions);

    return this.findOne(saved.id);
  }

  findAll() {
    return this.repo.find({
      relations: ['profilePermissions'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const profile = await this.repo.findOne({
      where: { id },
      relations: ['profilePermissions'],
    });
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
      await this.syncPermissions(id, dto.permissions);
    }

    if (dto.active !== undefined) {
      profile.active = dto.active;
    }

    await this.repo.save(profile);
    return this.findOne(id);
  }

  async delete(id: string) {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    await this.repo.remove(profile);
    return { message: 'Perfil eliminado exitosamente' };
  }
}
