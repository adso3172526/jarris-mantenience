import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const entity = this.repo.create({
      name: dto.name.trim(),
      codePrefix: dto.codePrefix.trim().toUpperCase(),
      nextSequence: 1,
      active: true,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Category not found');
    return item;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const item = await this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.codePrefix !== undefined) item.codePrefix = dto.codePrefix.trim().toUpperCase();
    if (dto.active !== undefined) item.active = dto.active;
    return this.repo.save(item);
  }

  // ✅ NUEVO: Eliminar categoría
  async delete(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    
    if (!item) {
      throw new NotFoundException('Categoría no encontrada');
    }
    
    await this.repo.remove(item);
    
    return { 
      message: 'Categoría eliminada exitosamente',
      deletedCategoryId: id,
      deletedCategoryName: item.name
    };
  }
}
