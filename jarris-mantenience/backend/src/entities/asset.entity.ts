import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { LocationEntity } from './location.entity';
import { AssetEventEntity } from './asset-event.entity';

export enum AssetStatus {
  ACTIVO = 'ACTIVO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  BAJA = 'BAJA',
}

@Entity('assets')
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => CategoryEntity, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

  @ManyToOne(() => LocationEntity, { eager: true })
  @JoinColumn({ name: 'locationId' })
  location: LocationEntity;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  serial: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVO,
  })
  status: AssetStatus;

  @Column({ type: 'text', nullable: true })
  qrCode: string;

  @Column('simple-array', { nullable: true })
  photos: string[];

  @OneToMany(() => AssetEventEntity, (event) => event.asset)
  events: AssetEventEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
