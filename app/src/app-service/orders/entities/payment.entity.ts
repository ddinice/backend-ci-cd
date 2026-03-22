import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum PaymentRowStatus {
  UNPAID = 'UNPAID',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
@Index('UQ_payments_order_id', ['orderId'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: PaymentRowStatus,
    enumName: 'payments_status_enum',
    default: PaymentRowStatus.UNPAID,
  })
  status: PaymentRowStatus;

  @Column({
    type: 'varchar',
    name: 'external_payment_id',
    length: 120,
    nullable: true,
  })
  externalPaymentId: string | null;

  @Column({
    type: 'varchar',
    name: 'provider_ref',
    length: 120,
    nullable: true,
  })
  providerRef: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
