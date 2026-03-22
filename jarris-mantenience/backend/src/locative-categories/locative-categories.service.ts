import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocativeCategoryEntity } from '../entities/locative-category.entity';
import { CreateLocativeCategoryDto } from './dto/create-locative-category.dto';
import { UpdateLocativeCategoryDto } from './dto/update-locative-category.dto';

const SEED_CATEGORIES = [
  'PINTURA',
  'ELECTRICO',
  'ESTRUCTURAL',
  'PLOMERIA',
  'HVAC',
  'PISOS',
  'FACHADA',
  'CARPINTERIA',
  'OTROS',
];

@Injectable()
export class LocativeCategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(LocativeCategoryEntity)
    private readonly repo: Repository<LocativeCategoryEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      const entities = SEED_CATEGORIES.map((name) =>
        this.repo.create({ name, active: true }),
      );
      await this.repo.save(entities);
    }
  }

  async create(dto: CreateLocativeCategoryDto) {
    const entity = this.repo.create({
      name: dto.name.trim().toUpperCase(),
      active: true,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findActive() {
    return this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Categoría locativa no encontrada');
    return item;
  }

  async update(id: string, dto: UpdateLocativeCategoryDto) {
    const item = await this.findOne(id);

    if (dto.name !== undefined) item.name = dto.name.trim().toUpperCase();
    if (dto.active !== undefined) item.active = dto.active;

    return this.repo.save(item);
  }
}
