import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column()
  year!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  annual_limit!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  used_amount!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
