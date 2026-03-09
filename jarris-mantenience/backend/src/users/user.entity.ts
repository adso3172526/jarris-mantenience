import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ unique: true })
  email: string;

  // bcrypt hash
  @Column()
  passwordHash: string;

  // Varios roles por usuario
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  roles: string[];

  @Column({ default: true })
  active: boolean;

  // Opcional: si en el futuro quieres amarrarlo a PDV
  @Column({ type: 'uuid', nullable: true })
  locationId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
