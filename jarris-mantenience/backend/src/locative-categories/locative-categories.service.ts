import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
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

    // Asignar código a categorías que no tengan
    const withoutCode = await this.repo.find({ where: { code: null as any } });
    for (const cat of withoutCode) {
      cat.code = await this.getNextCode();
      await this.repo.save(cat);
    }
  }

  async create(dto: CreateLocativeCategoryDto) {
    const normalizedName = dto.name.trim().toUpperCase();
    const existing = await this.repo
      .createQueryBuilder('lc')
      .where('UPPER(lc.name) = :name', { name: normalizedName })
      .getOne();
    if (existing) {
      throw new ConflictException(`Ya existe una categoría locativa con el nombre "${normalizedName}"`);
    }
    const nextCode = await this.getNextCode();
    const entity = this.repo.create({ name: normalizedName, code: nextCode, active: true });
    try {
      return await this.repo.save(entity);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException(`Ya existe una categoría locativa con el nombre "${normalizedName}"`);
      }
      throw err;
    }
  }

  private async getNextCode(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('lc')
      .select('MAX(lc.code)', 'max')
      .getRawOne();
    const max = result?.max ?? 0;
    return max < 1000 ? 1000 : max + 1;
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

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim().toUpperCase();
      const existing = await this.repo
        .createQueryBuilder('lc')
        .where('UPPER(lc.name) = :name', { name: normalizedName })
        .getOne();
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe una categoría locativa con el nombre "${normalizedName}"`);
      }
      item.name = normalizedName;
    }
    if (dto.active !== undefined) item.active = dto.active;

    return this.repo.save(item);
  }
}
