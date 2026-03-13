import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '../entities/user.entity';
import { ROLES } from './roles';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    private readonly config: ConfigService,
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
    console.log(`[seed] Admin creado: ${email}`);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      roles: dto.roles,
      active: true,
      locationId: dto.locationId ?? null,
    });
    return this.repo.save(user);
  }

  findAll() {
    return this.repo.find({
      select: ['id', 'name', 'email', 'phone', 'roles', 'active', 'locationId', 'createdAt', 'updatedAt'],
      relations: ['location'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const user = await this.repo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'roles', 'active', 'locationId', 'createdAt', 'updatedAt'],
      relations: ['location'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmailWithHash(email: string) {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findTechniciansAndContractors() {
    const users = await this.repo.find({
      where: { active: true },
      select: ['id', 'name', 'email', 'roles'],
    });

    return users.filter(u => 
      u.roles.includes(ROLES.TECNICO_INTERNO) || 
      u.roles.includes(ROLES.CONTRATISTA)
    );
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase().trim();
    if (dto.roles) user.roles = dto.roles;
    if (dto.locationId !== undefined) user.locationId = dto.locationId ?? null;
    if (dto.active !== undefined) user.active = dto.active;

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