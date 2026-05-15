import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { WarehouseEntity } from './warehouse.entity';

export enum UnitOfMeasure {
  UNIDADES = 'UNIDADES',
  METROS = 'METROS',
  KILOGRAMOS = 'KILOGRAMOS',
  LITROS = 'LITROS',
  GALONES = 'GALONES',
  PIEZAS = 'PIEZAS',
  CAJAS = 'CAJAS',
  PARES = 'PARES',
}

@Entity('warehouse_items')
@Unique(['warehouseId', 'name'])
export class WarehouseItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: WarehouseEntity;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'enum', enum: UnitOfMeasure })
  unitOfMeasure: UnitOfMeasure;

  @Column({ length: 100, nullable: true })
  weightOrSize?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  stock: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  minimumStock: number;

  @Column({ type: 'text', nullable: true })
  observations?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
