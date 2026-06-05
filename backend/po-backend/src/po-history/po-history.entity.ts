import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { PurchaseOrder } from '../purchase-orders/purchase-order.entity';

@Entity('po_history')
export class POHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PurchaseOrder)
  purchaseOrder!: PurchaseOrder;

  @Column()
  action!: string;

  @Column({ nullable: true })
  comment!: string;

  @ManyToOne(() => User)
  performedBy!: User;

  @CreateDateColumn()
  timestamp!: Date;
}
