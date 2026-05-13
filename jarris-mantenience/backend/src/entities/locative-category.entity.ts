import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('locative_categories')
export class LocativeCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true, nullable: true })
  code: number | null;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ default: true })
  active: boolean;
}
