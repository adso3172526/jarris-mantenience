import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LocationType {
  PDV = 'PDV',
  DEPARTAMENTO = 'DEPARTAMENTO',
  PLANTA = 'PLANTA',
}

@Entity('locations')
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120, unique: true })
  name: string;

  @Column({ type: 'enum', enum: LocationType })
  type: LocationType;

  @Column({ type: 'int', nullable: true, unique: true })
  operationalCenter: number | null;

  @Column({ type: 'int', nullable: true, unique: true })
  costCenter: number | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
