import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { LocationEntity } from './location.entity';
import { ProfileEntity } from './profile.entity';
import { UserRoleEntity } from './user-role.entity';
import { UserLocationEntity } from './user-location.entity';

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

  @OneToMany(() => UserRoleEntity, (ur) => ur.user, { cascade: true })
  userRoles: UserRoleEntity[];

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

  @OneToMany(() => UserLocationEntity, (ul) => ul.user, { cascade: true })
  userLocations: UserLocationEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
