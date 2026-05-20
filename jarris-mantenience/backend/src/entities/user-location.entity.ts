import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { LocationEntity } from './location.entity';

@Entity('user_locations')
@Unique(['userId', 'locationId'])
export class UserLocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.userLocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: LocationEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
