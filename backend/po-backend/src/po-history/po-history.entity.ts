import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import {
  PurchaseOrder,
  POStatus,
} from '../purchase-orders/purchase-order.entity';

export enum POAction {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HARD_REJECTED = 'HARD_REJECTED',
  REWORKED = 'REWORKED',
  INVOICED = 'INVOICED',
}

@Entity('po_history')
export class POHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PurchaseOrder)
  purchaseOrder!: PurchaseOrder;

  @Column({ type: 'enum', enum: POAction })
  action!: POAction;

  @Column({ type: 'enum', enum: POStatus })
  fromStatus!: POStatus;

  @Column({ type: 'enum', enum: POStatus })
  toStatus!: POStatus;

  @Column({ nullable: true })
  comment?: string;

  @ManyToOne(() => User)
  performedBy!: User;

  @CreateDateColumn()
  timestamp!: Date;
}