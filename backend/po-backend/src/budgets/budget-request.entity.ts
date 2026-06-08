import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/users/user.entity';

export type BudgetRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('budget_requests')
export class BudgetRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  requester!: User;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  requestedLimit!: number | null;

  @Column({ default: 'PENDING' })
  status!: BudgetRequestStatus;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  approvedLimit!: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  reviewedBy!: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
