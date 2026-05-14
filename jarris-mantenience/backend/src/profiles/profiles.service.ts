import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ALL_PERMISSIONS } from '../common/enums/permission.enum';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly repo: Repository<ProfileEntity>,
  ) {}

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
