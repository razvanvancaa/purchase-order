import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum POCategory {
  SERVICES = 'SERVICES',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  IT_EQUIPMENT = 'IT_EQUIPMENT',
}

export enum POStatus {
  DRAFT = 'DRAFT',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_IT = 'PENDING_IT',
  PENDING_FINANCE = 'PENDING_FINANCE',
  NEEDS_REWORK = 'NEEDS_REWORK',
  INVOICED = 'INVOICED',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: POCategory })
  category!: POCategory;

  @Column({ type: 'enum', enum: POStatus, default: POStatus.DRAFT })
  status!: POStatus;

  @ManyToOne(() => User)
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
