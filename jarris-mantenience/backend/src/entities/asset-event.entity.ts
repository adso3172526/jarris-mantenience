import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { AssetEntity } from './asset.entity';
import { LocationEntity } from './location.entity';
import { WorkOrderEntity } from './work-order.entity';

export enum AssetEventType {
  COMPRA = 'COMPRA',
  TRASLADO = 'TRASLADO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  REPARACION = 'REPARACION',
  BAJA = 'BAJA',
  REACTIVACION = 'REACTIVACION',
}

@Entity('asset_events')
export class AssetEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AssetEntity)
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity;

  @Column({ type: 'enum', enum: AssetEventType })
  type: AssetEventType;

  // Getter para compatibilidad con frontend
  get eventType() {
    return this.type;
  }

  @ManyToOne(() => LocationEntity, { nullable: true })
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: LocationEntity;

  @ManyToOne(() => LocationEntity, { nullable: true })
  @JoinColumn({ name: 'to_location_id' })
  toLocation: LocationEntity;

  @Column({ length: 300 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  voidedAt?: Date;

  @Column({ nullable: true })
  voidedBy?: string;

  @Column({ nullable: true })
  voidReason?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // ⭐ Columna explícita para workOrderId
  @Column({ type: 'uuid', nullable: true })
  workOrderId?: string;

  // ⭐ Relación con WorkOrder (UN SOLO workOrder, NO duplicado)
  @ManyToOne(() => WorkOrderEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workOrderId' })
  workOrder?: WorkOrderEntity;
}
