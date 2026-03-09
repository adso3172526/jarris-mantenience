import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Freidoras

  @Column({ name: 'code_prefix', length: 10, unique: true })
  codePrefix: string; // FR, HR, RF

  @Column({ name: 'next_sequence', type: 'int', default: 1 })
  nextSequence: number; // 1 -> EQ-FR-0001

  @Column({ default: true })
  active: boolean;
}
