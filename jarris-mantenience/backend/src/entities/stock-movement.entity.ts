import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { WarehouseEntity } from './warehouse.entity';
import { WarehouseItemEntity } from './warehouse-item.entity';
import { WorkOrderEntity } from './work-order.entity';

export enum StockMovementType {
  INGRESO = 'INGRESO',
  CONSUMO = 'CONSUMO',
  TRASLADO_ENTRADA = 'TRASLADO_ENTRADA',
  TRASLADO_SALIDA = 'TRASLADO_SALIDA',
  AJUSTE = 'AJUSTE',
}

@Entity('stock_movements')
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: WarehouseEntity;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => WarehouseItemEntity, { eager: true })
  @JoinColumn({ name: 'itemId' })
  item: WarehouseItemEntity;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitCostAtTime: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  @ManyToOne(() => WorkOrderEntity, { nullable: true })
  @JoinColumn({ name: 'workOrderId' })
  workOrder: WorkOrderEntity;

  @Column({ type: 'uuid', nullable: true })
  workOrderId?: string;

  @Column({ type: 'uuid', nullable: true })
  transferId?: string;

  @Column({ type: 'text', nullable: true })
  observation?: string;

  @Column()
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
