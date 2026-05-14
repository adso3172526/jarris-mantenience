import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { LocationEntity } from './location.entity';
import { ProfileEntity } from './profile.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  roles: string[];

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'uuid', nullable: true })
  profileId?: string | null;

  @ManyToOne(() => ProfileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'profileId' })
  profile?: ProfileEntity;

  @Column({ type: 'uuid', nullable: true })
  locationId?: string | null;

  @ManyToOne(() => LocationEntity, { nullable: true })
  @JoinColumn({ name: 'locationId' })
  location?: LocationEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
