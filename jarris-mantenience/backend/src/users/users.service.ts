import { Injectable, NotFoundException, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UserLocationEntity } from '../entities/user-location.entity';
import { ROLES } from './roles';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfilesService, ROLE_TO_PROFILE_NAME } from '../profiles/profiles.service';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly roleRepo: Repository<UserRoleEntity>,
    @InjectRepository(UserLocationEntity)
    private readonly userLocationRepo: Repository<UserLocationEntity>,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ProfilesService))
    private readonly profilesService: ProfilesService,
  ) {}

  async onModuleInit() {
    // Migrate jsonb data to normalized tables (runs once)
    await this.migrateJsonbToTables();

    const email = this.config.get<string>('ADMIN_EMAIL');
    const pass = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !pass) return;

    const exists = await this.repo.findOne({ where: { email }, relations: ['userRoles'] });
    if (exists) {
      // Ensure existing admin has ADMIN role in user_roles table
      const hasAdminRole = (exists.userRoles || []).some(ur => ur.role === ROLES.ADMIN);
      if (!hasAdminRole) {
        await this.roleRepo.save(this.roleRepo.create({ userId: exists.id, role: ROLES.ADMIN }));
        this.logger.log(`[seed] Added ADMIN role to existing admin: ${email}`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(pass, 10);

    const admin = this.repo.create({
      email,
      passwordHash,
      active: true,
      locationId: null,
    });
    const savedAdmin = await this.repo.save(admin);

    // Assign ADMIN role
    await this.roleRepo.save(this.roleRepo.create({ userId: savedAdmin.id, role: ROLES.ADMIN }));

    this.logger.log(`[seed] Admin creado: ${email}`);
  }

  /**
   * One-time migration: copies data from jsonb columns to normalized junction tables.
   * Safe to run multiple times — skips if junction tables already have data.
   */
  private async migrateJsonbToTables() {
    const qr = this.repo.manager;

    // 1. Migrate user.roles jsonb → user_roles table
    try {
      const userRolesCount = await this.roleRepo.count();
      if (userRolesCount === 0) {
        const hasRolesCol = await qr.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'roles'
        `);
        if (hasRolesCol.length > 0) {
          const usersWithRoles: { id: string; roles: any }[] = await qr.query(`
            SELECT id, roles FROM users WHERE roles IS NOT NULL AND roles::text != '[]'
          `);
          let migrated = 0;
          for (const u of usersWithRoles) {
            const roles = Array.isArray(u.roles) ? u.roles : (typeof u.roles === 'string' ? JSON.parse(u.roles) : []);
            for (const role of roles) {
              await this.roleRepo.save(this.roleRepo.create({ userId: u.id, role })).catch(() => {});
            }
            migrated++;
          }
          if (migrated > 0) {
            this.logger.log(`[migration] Migrated roles for ${migrated} users`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`[migration] Error migrating roles: ${error.message}`);
    }

    // 2. Migrate profile.permissions jsonb → profile_permissions table
    try {
      const ppCount = await qr.query(`SELECT COUNT(*) as cnt FROM profile_permissions`).then(r => +r[0].cnt);
      if (ppCount === 0) {
        const hasPermsCol = await qr.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'permissions'
        `);
        if (hasPermsCol.length > 0) {
          const profilesWithPerms: { id: string; permissions: any }[] = await qr.query(`
            SELECT id, permissions FROM profiles WHERE permissions IS NOT NULL AND permissions::text != '[]'
          `);
          let migrated = 0;
          for (const p of profilesWithPerms) {
            const perms = Array.isArray(p.permissions) ? p.permissions : (typeof p.permissions === 'string' ? JSON.parse(p.permissions) : []);
            for (const perm of perms) {
              await this.profilesService.addPermissionRaw(p.id, perm).catch(() => {});
            }
            migrated++;
          }
          if (migrated > 0) {
            this.logger.log(`[migration] Migrated permissions for ${migrated} profiles`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`[migration] Error migrating permissions: ${error.message}`);
    }

    // 3. Migrate profile.locationIds jsonb → user_locations table (moved from profiles to users)
    try {
      const ulCount = await this.userLocationRepo.count();
      if (ulCount === 0) {
        const hasLocIdsCol = await qr.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'locationIds'
        `);
        if (hasLocIdsCol.length > 0) {
          const profilesWithLocs: { id: string; locationIds: any }[] = await qr.query(`
            SELECT id, "locationIds" FROM profiles WHERE "locationIds" IS NOT NULL AND "locationIds"::text != '[]'
          `);
          for (const profile of profilesWithLocs) {
            const locIds = Array.isArray(profile.locationIds) ? profile.locationIds : (typeof profile.locationIds === 'string' ? JSON.parse(profile.locationIds) : []);
            const usersWithProfile: { id: string }[] = await qr.query(
              `SELECT id FROM users WHERE "profileId" = $1`, [profile.id],
            );
            for (const u of usersWithProfile) {
              for (const locId of locIds) {
                await this.userLocationRepo.save(
                  this.userLocationRepo.create({ userId: u.id, locationId: locId }),
                ).catch(() => {});
              }
            }
          }
          if (profilesWithLocs.length > 0) {
            this.logger.log(`[migration] Migrated locationIds from ${profilesWithLocs.length} profiles to user_locations`);
          }
        }

        // Also migrate user.locationId (singular) if user_locations is still empty
        const ulCountAfter = await this.userLocationRepo.count();
        if (ulCountAfter === 0) {
          const usersWithLoc: { id: string; locationId: string }[] = await qr.query(`
            SELECT id, "locationId" FROM users WHERE "locationId" IS NOT NULL
          `);
          for (const u of usersWithLoc) {
            await this.userLocationRepo.save(
              this.userLocationRepo.create({ userId: u.id, locationId: u.locationId }),
            ).catch(() => {});
          }
          if (usersWithLoc.length > 0) {
            this.logger.log(`[migration] Migrated locationId for ${usersWithLoc.length} users`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`[migration] Error migrating locations: ${error.message}`);
    }
  }

  // --- Helpers ---

  private getUserRoles(user: UserEntity): string[] {
    return (user.userRoles || []).map(ur => ur.role);
  }

  private getUserLocationIds(user: UserEntity): string[] {
    return (user.userLocations || []).map(ul => ul.locationId);
  }

  private async syncUserRoles(userId: string, roles: string[]) {
    await this.roleRepo.delete({ userId });
    if (roles.length > 0) {
      const entities = roles.map(role => this.roleRepo.create({ userId, role }));
      await this.roleRepo.save(entities);
    }
  }

  private async syncUserLocations(userId: string, locationIds: string[]) {
    await this.userLocationRepo.delete({ userId });
    if (locationIds.length > 0) {
      const entities = locationIds.map(locationId => this.userLocationRepo.create({ userId, locationId }));
      await this.userLocationRepo.save(entities);
    }
  }

  // --- CRUD ---

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const isAdmin = dto.roles?.includes(ROLES.ADMIN);

    const user = this.repo.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      profileId: isAdmin ? null : (dto.profileId || null),
      active: true,
      locationId: dto.locationId ?? null,
    });
    const saved = await this.repo.save(user);

    // Sync roles
    const roles = isAdmin ? [ROLES.ADMIN] : (dto.roles || []);
    await this.syncUserRoles(saved.id, roles);

    // Sync locations
    if (dto.locationIds && dto.locationIds.length > 0) {
      await this.syncUserLocations(saved.id, dto.locationIds);
    } else if (dto.locationId) {
      await this.syncUserLocations(saved.id, [dto.locationId]);
    }

    return this.findById(saved.id);
  }

  findAll() {
    return this.repo.find({
      select: ['id', 'name', 'email', 'phone', 'active', 'locationId', 'profileId', 'createdAt', 'updatedAt'],
      relations: ['location', 'profile', 'userRoles', 'userLocations', 'userLocations.location'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const user = await this.repo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'active', 'locationId', 'profileId', 'createdAt', 'updatedAt'],
      relations: ['location', 'profile', 'userRoles', 'userLocations', 'userLocations.location'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmailWithHash(email: string) {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['profile', 'profile.profilePermissions', 'userRoles', 'userLocations'],
    });
  }

  async findTechniciansAndContractors() {
    const users = await this.repo.find({
      where: { active: true },
      select: ['id', 'name', 'email', 'profileId'],
      relations: ['profile', 'userRoles'],
    });

    const techProfileNames = [
      ROLE_TO_PROFILE_NAME[ROLES.TECNICO_INTERNO],
      ROLE_TO_PROFILE_NAME[ROLES.CONTRATISTA],
    ];

    return users.filter(u => {
      const roles = this.getUserRoles(u);
      return (
        roles.includes(ROLES.TECNICO_INTERNO) ||
        roles.includes(ROLES.CONTRATISTA) ||
        (u.profile && techProfileNames.includes(u.profile.name))
      );
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase().trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.locationId !== undefined) user.locationId = dto.locationId ?? null;
    if (dto.active !== undefined) user.active = dto.active;

    // ADMIN gets role ADMIN and no profile; everyone else gets a profile
    if (dto.roles !== undefined || dto.profileId !== undefined) {
      const isAdmin = dto.roles?.includes(ROLES.ADMIN);
      if (isAdmin) {
        await this.syncUserRoles(id, [ROLES.ADMIN]);
        user.profileId = null;
      } else {
        await this.syncUserRoles(id, dto.roles || []);
        if (dto.profileId !== undefined) {
          user.profileId = dto.profileId || null;
        }
      }
    }

    // Sync locations if provided
    if (dto.locationIds !== undefined) {
      await this.syncUserLocations(id, dto.locationIds);
    }

    if (dto.password && dto.password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.repo.save(user);
    return this.findById(id);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);

    return {
      message: 'Contraseña restablecida exitosamente',
      userId: id,
      email: user.email,
    };
  }

  async delete(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.repo.remove(user);

    return {
      message: 'Usuario eliminado exitosamente',
      deletedUserId: id,
      deletedEmail: user.email,
    };
  }
}
