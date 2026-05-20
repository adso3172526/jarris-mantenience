import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProfileEntity } from './profile.entity';

@Entity('profile_permissions')
@Unique(['profileId', 'permission'])
export class ProfilePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => ProfileEntity, (profile) => profile.profilePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile: ProfileEntity;

  @Column({ type: 'varchar' })
  permission: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
