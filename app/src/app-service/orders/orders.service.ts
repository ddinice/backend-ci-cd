import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment, PaymentRowStatus } from './entities/payment.entity';
import { AuthorizeResponse } from '../grpc-client/interfaces/payments.interface';

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async createOrder(items: CreateOrderItemInput[]): Promise<Order> {
    const newOrder = await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      const order = orderRepository.create({
        status: OrderStatus.PENDING,
      });

      await orderRepository.save(order);

      const orderItems = orderItemRepository.create(
        items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: '100',
        })),
      );

      await orderItemRepository.save(orderItems);

      return order;
    });
    return newOrder;
  }

  async findById(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.ordersRepository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async markOrderPaymentResult(
    orderId: string,
    payment: Pick<AuthorizeResponse, 'paymentId' | 'providerRef' | 'status'>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const paymentsRepository = manager.getRepository(Payment);
      const mappedStatus = this.mapGrpcPaymentStatus(payment.status);

      const order = await orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      await paymentsRepository.upsert(
        {
          orderId,
          status: mappedStatus,
          externalPaymentId: payment.paymentId ?? null,
          providerRef: payment.providerRef ?? null,
        },
        ['orderId'],
      );

      if (mappedStatus === PaymentRowStatus.PAID) {
        order.status = OrderStatus.PAID;
        await orderRepository.save(order);
      }
    });
  }

  private mapGrpcPaymentStatus(grpcStatus: string | number): PaymentRowStatus {
    if (typeof grpcStatus === 'number') {
      switch (grpcStatus) {
        case 1:
        case 2:
          return PaymentRowStatus.PAID;
        case 5:
          return PaymentRowStatus.PENDING;
        case 3:
          return PaymentRowStatus.REFUNDED;
        case 4:
          return PaymentRowStatus.FAILED;
        default:
          return PaymentRowStatus.UNPAID;
      }
    }

    switch (grpcStatus) {
      case 'PAYMENT_STATUS_AUTHORIZED':
      case 'PAYMENT_STATUS_CAPTURED':
        return PaymentRowStatus.PAID;
      case 'PAYMENT_STATUS_PENDING':
        return PaymentRowStatus.PENDING;
      case 'PAYMENT_STATUS_REFUNDED':
        return PaymentRowStatus.REFUNDED;
      case 'PAYMENT_STATUS_FAILED':
        return PaymentRowStatus.FAILED;
      default:
        return PaymentRowStatus.UNPAID;
    }
  }
}
