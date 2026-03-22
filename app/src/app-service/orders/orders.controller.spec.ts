import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Order, OrderStatus } from './entities/order.entity';
import { PaymentsGrpcClient } from '../grpc-client/payments-grpc.client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<
    Pick<
      OrdersService,
      | 'createOrder'
      | 'findById'
      | 'findAll'
      | 'deleteById'
      | 'markOrderPaymentResult'
    >
  >;
  let paymentsGrpcClient: jest.Mocked<Pick<PaymentsGrpcClient, 'authorize'>>;

  const orderId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
      markOrderPaymentResult: jest.fn(),
    };
    paymentsGrpcClient = {
      authorize: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: PaymentsGrpcClient, useValue: paymentsGrpcClient },
      ],
    }).compile();

    controller = module.get(OrdersController);
  });

  describe('create', () => {
    it('delegates to ordersService.createOrder', async () => {
      const order = { id: orderId, status: OrderStatus.PENDING } as Order;
      ordersService.createOrder.mockResolvedValue(order);

      const result = await controller.create(
        {} as Parameters<OrdersController['create']>[0],
        { items: [{ productId: 'p', quantity: 1 }] },
      );

      expect(ordersService.createOrder).toHaveBeenCalledWith([
        { productId: 'p', quantity: 1 },
      ]);
      expect(result).toBe(order);
    });

    it('uses empty items when body.items is missing', async () => {
      ordersService.createOrder.mockResolvedValue({} as Order);

      await controller.create(
        {} as Parameters<OrdersController['create']>[0],
        {} as Parameters<OrdersController['create']>[1],
      );

      expect(ordersService.createOrder).toHaveBeenCalledWith([]);
    });
  });

  describe('payOrder', () => {
    it('throws when order is not found', async () => {
      ordersService.findById.mockResolvedValue(null);

      await expect(
        controller.payOrder(orderId, {
          amount: '10.00',
          currency: 'USD',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(paymentsGrpcClient.authorize).not.toHaveBeenCalled();
    });

    it('authorizes payment and marks result when order exists', async () => {
      const existing = { id: orderId } as Order;
      ordersService.findById.mockResolvedValue(existing);
      const paymentResponse = {
        paymentId: 'pay-1',
        providerRef: 'ref',
        status: 'PAYMENT_STATUS_AUTHORIZED',
      };
      paymentsGrpcClient.authorize.mockResolvedValue(paymentResponse as never);

      const dto = {
        amount: '10.00',
        currency: 'USD',
        idempotencyKey: 'idem-1',
        paymentMethod: 'card',
      };

      const result = await controller.payOrder(orderId, dto);

      expect(paymentsGrpcClient.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          total: { amount: dto.amount, currency: dto.currency },
          idempotencyKey: 'idem-1',
          paymentMethod: 'card',
        }),
      );
      expect(ordersService.markOrderPaymentResult).toHaveBeenCalledWith(
        orderId,
        paymentResponse,
      );
      expect(result).toEqual(paymentResponse);
    });
  });

  describe('list', () => {
    it('returns findAll()', async () => {
      const list = [{ id: orderId } as Order];
      ordersService.findAll.mockResolvedValue(list);

      await expect(controller.list()).resolves.toBe(list);
    });
  });

  describe('byId', () => {
    it('throws when order is missing', async () => {
      ordersService.findById.mockResolvedValue(null);

      await expect(controller.byId(orderId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns order when found', async () => {
      const order = { id: orderId } as Order;
      ordersService.findById.mockResolvedValue(order);

      await expect(controller.byId(orderId)).resolves.toBe(order);
    });
  });

  describe('remove', () => {
    it('throws when delete did not affect a row', async () => {
      ordersService.deleteById.mockResolvedValue(false);

      await expect(controller.remove(orderId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns ok when deleted', async () => {
      ordersService.deleteById.mockResolvedValue(true);

      await expect(controller.remove(orderId)).resolves.toEqual({ ok: true });
    });
  });
});
