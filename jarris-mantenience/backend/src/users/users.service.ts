import { Injectable, NotFoundException, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '../entities/user.entity';
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
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ProfilesService))
    private readonly profilesService: ProfilesService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const pass = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !pass) return;

    const exists = await this.repo.findOne({ where: { email } });
    if (exists) return;

    const passwordHash = await bcrypt.hash(pass, 10);

    const admin = this.repo.create({
      email,
      passwordHash,
      roles: [ROLES.ADMIN],
      active: true,
      locationId: null,
    });

    await this.repo.save(admin);
    this.logger.log(`[seed] Admin creado: ${email}`);

    // Migrate existing users with roles (except ADMIN) to profiles
    await this.migrateUsersToProfiles();
  }

  async migrateUsersToProfiles() {
    const users = await this.repo.find();
    let migrated = 0;

    for (const user of users) {
      // Skip users that already have a profile or are ADMIN
      if (user.profileId) continue;
      if (!user.roles || user.roles.length === 0) continue;
      if (user.roles.includes(ROLES.ADMIN)) continue;

      const roleName = user.roles[0];
      const profileName = ROLE_TO_PROFILE_NAME[roleName];
      if (!profileName) continue;

      const profile = await this.profilesService.findByName(profileName);
      if (!profile) continue;

      user.profileId = profile.id;
      user.roles = [];
      await this.repo.save(user);
      migrated++;
    }

    if (migrated > 0) {
      this.logger.log(`[migration] ${migrated} usuarios migrados a perfiles`);
    }
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const isAdmin = dto.roles?.includes(ROLES.ADMIN);

    const user = this.repo.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      roles: isAdmin ? [ROLES.ADMIN] : [],
      profileId: isAdmin ? null : (dto.profileId || null),
      active: true,
      locationId: dto.locationId ?? null,
    });
    return this.repo.save(user);
  }

  findAll() {
    return this.repo.find({
      select: ['id', 'name', 'email', 'phone', 'roles', 'active', 'locationId', 'profileId', 'createdAt', 'updatedAt'],
      relations: ['location', 'profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const user = await this.repo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'roles', 'active', 'locationId', 'profileId', 'createdAt', 'updatedAt'],
      relations: ['location', 'profile'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmailWithHash(email: string) {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['profile'],
    });
  }

  async findTechniciansAndContractors() {
    const users = await this.repo.find({
      where: { active: true },
      select: ['id', 'name', 'email', 'roles', 'profileId'],
      relations: ['profile'],
    });

    const techProfileNames = [
      ROLE_TO_PROFILE_NAME[ROLES.TECNICO_INTERNO],
      ROLE_TO_PROFILE_NAME[ROLES.CONTRATISTA],
    ];

    return users.filter(u =>
      // Legacy: check old roles array
      u.roles.includes(ROLES.TECNICO_INTERNO) ||
      u.roles.includes(ROLES.CONTRATISTA) ||
      // New: check profile name
      (u.profile && techProfileNames.includes(u.profile.name))
    );
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase().trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.locationId !== undefined) user.locationId = dto.locationId ?? null;
    if (dto.active !== undefined) user.active = dto.active;

    // ADMIN gets roles=['ADMIN'] and no profile; everyone else gets a profile
    if (dto.roles !== undefined || dto.profileId !== undefined) {
      const isAdmin = dto.roles?.includes(ROLES.ADMIN);
      if (isAdmin) {
        user.roles = [ROLES.ADMIN];
        user.profileId = null;
      } else {
        user.roles = [];
        if (dto.profileId !== undefined) {
          user.profileId = dto.profileId || null;
        }
      }
    }

    if (dto.password && dto.password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.repo.save(user);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);

    return {
      message: 'Contraseña restablecida exitosamente',
      userId: id,
      email: user.email
    };
  }

  async delete(id: string) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.repo.remove(user);

    return {
      message: 'Usuario eliminado exitosamente',
      deletedUserId: id,
      deletedEmail: user.email
    };
  }
}
