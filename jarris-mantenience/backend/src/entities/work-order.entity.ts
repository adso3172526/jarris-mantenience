import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { AssetEntity } from './asset.entity';
import { LocationEntity } from './location.entity';

export enum WorkOrderStatus {
  NUEVA = 'NUEVA',
  ASIGNADA = 'ASIGNADA',
  EN_PROCESO = 'EN_PROCESO',
  TERMINADA = 'TERMINADA',
  CERRADA = 'CERRADA',
  RECHAZADA = 'RECHAZADA',
}

export enum AssigneeType {
  INTERNO = 'INTERNO',
  CONTRATISTA = 'CONTRATISTA',
}

// ✅ NUEVO: Tipo de mantenimiento
export enum MaintenanceType {
  EQUIPO = 'EQUIPO',
  LOCATIVO = 'LOCATIVO',
}

@Entity('work_orders')
export class WorkOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ CAMBIO: Asset ahora es OPCIONAL (nullable: true)
  @ManyToOne(() => AssetEntity, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset?: AssetEntity;

  // Ubicación siempre requerida
  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: 'location_id' })
  location: LocationEntity;

  // ✅ NUEVO: Tipo de mantenimiento
  @Column({
    type: 'varchar',
    length: 20,
    default: MaintenanceType.EQUIPO,
    name: 'maintenance_type',
  })
  maintenanceType: MaintenanceType;

  // ✅ NUEVO: Categoría locativa (solo si es LOCATIVO)
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'locative_category',
  })
  locativeCategory?: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  requestDescription?: string;

  @Column({ type: 'enum', enum: WorkOrderStatus, default: WorkOrderStatus.NUEVA })
  status: WorkOrderStatus;

  @Column({ type: 'enum', enum: AssigneeType, nullable: true })
  assigneeType?: AssigneeType;

  @Column({ nullable: true })
  assigneeName?: string;

  @Column({ nullable: true })
  assigneeEmail?: string;

  @Column({ type: 'text', nullable: true })
  assignmentDescription?: string;

  // Campos de rechazo
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  rejectedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt?: Date;

  // Fotos
  @Column({ type: 'simple-array', nullable: true })
  pdvPhotos?: string[];

  @Column({ type: 'simple-array', nullable: true })
  technicianPhotos?: string[];

  // Lo que llena el técnico/contratista al TERMINAR
  @Column({ type: 'text', nullable: true })
  workDoneDescription?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ nullable: true })
  startedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  finishedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @Column({ nullable: true })
  invoiceFileName?: string;

  @Column({ nullable: true })
  invoiceFilePath?: string;

  @Column({ type: 'timestamptz', nullable: true })
  invoiceUploadedAt?: Date;

  @Column({ nullable: true })
  invoiceUploadedBy?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'event_type' })
  eventType?: string;

  @Column({ nullable: true })
  closedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
