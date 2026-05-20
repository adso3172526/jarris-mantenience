import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProfilePermissionEntity } from './profile-permission.entity';

@Entity('profiles')
export class ProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => ProfilePermissionEntity, (pp) => pp.profile, { cascade: true })
  profilePermissions: ProfilePermissionEntity[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
