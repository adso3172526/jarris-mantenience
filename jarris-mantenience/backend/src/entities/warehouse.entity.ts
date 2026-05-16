import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationEntity } from './location.entity';

@Entity('warehouses')
export class WarehouseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: 'locationId' })
  location: LocationEntity;

  @Column({ type: 'uuid' })
  locationId: string;

  @Column({ type: 'int', nullable: true, unique: true })
  costCenter: number | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
