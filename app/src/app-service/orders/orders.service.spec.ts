import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment, PaymentRowStatus } from './entities/payment.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let dataSource: { transaction: jest.Mock };
  let ordersRepository: jest.Mocked<
    Pick<Repository<Order>, 'findOne' | 'find' | 'delete'>
  >;

  const orderId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
    };

    ordersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('createOrder', () => {
    it('creates order and items inside a transaction', async () => {
      const orderRepo = {
        create: jest.fn((data: Partial<Order>) => ({ ...data }) as Order),
        save: jest.fn(async (entity: Order) => {
          entity.id = orderId;
          return entity;
        }),
      };
      const orderItemRepo = {
        create: jest.fn((rows: Partial<OrderItem>[]) => rows),
        save: jest.fn().mockResolvedValue(undefined),
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Order) return orderRepo;
            if (entity === OrderItem) return orderItemRepo;
            throw new Error('unexpected entity');
          },
        };
        return cb(manager as never);
      });

      const result = await service.createOrder([
        { productId: 'p1', quantity: 2 },
      ]);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(orderRepo.create).toHaveBeenCalledWith({
        status: OrderStatus.PENDING,
      });
      expect(orderItemRepo.create).toHaveBeenCalledWith([
        {
          orderId: orderId,
          productId: 'p1',
          quantity: 2,
          priceAtPurchase: '100',
        },
      ]);
      expect(result.id).toBe(orderId);
    });
  });

  describe('findById', () => {
    it('returns order when found', async () => {
      const order = { id: orderId } as Order;
      ordersRepository.findOne.mockResolvedValue(order);

      await expect(service.findById(orderId)).resolves.toBe(order);
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        where: { id: orderId },
      });
    });

    it('returns null when missing', async () => {
      ordersRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(orderId)).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns orders sorted by createdAt DESC', async () => {
      const rows = [{ id: orderId } as Order];
      ordersRepository.find.mockResolvedValue(rows);

      await expect(service.findAll()).resolves.toBe(rows);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('deleteById', () => {
    it('returns true when a row was deleted', async () => {
      ordersRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.deleteById(orderId)).resolves.toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
      ordersRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.deleteById(orderId)).resolves.toBe(false);
    });
  });

  describe('markOrderPaymentResult', () => {
    it('throws when order does not exist', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const orderRepo = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Order) return orderRepo;
            return { upsert: jest.fn() };
          },
        };
        return cb(manager as never);
      });

      await expect(
        service.markOrderPaymentResult(orderId, {
          paymentId: 'ext-1',
          providerRef: 'ref',
          status: 'PAYMENT_STATUS_AUTHORIZED',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('upserts payment and sets order PAID for authorized string status', async () => {
      const order = {
        id: orderId,
        status: OrderStatus.PENDING,
      } as Order;
      const orderRepo = {
        findOne: jest.fn().mockResolvedValue(order),
        save: jest.fn().mockImplementation(async (o: Order) => o),
      };
      const paymentsRepo = {
        upsert: jest.fn().mockResolvedValue(undefined),
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Order) return orderRepo;
            if (entity === Payment) return paymentsRepo;
            throw new Error('unexpected entity');
          },
        };
        return cb(manager as never);
      });

      await service.markOrderPaymentResult(orderId, {
        paymentId: 'ext-1',
        providerRef: 'ref',
        status: 'PAYMENT_STATUS_AUTHORIZED',
      });

      expect(paymentsRepo.upsert).toHaveBeenCalledWith(
        {
          orderId,
          status: PaymentRowStatus.PAID,
          externalPaymentId: 'ext-1',
          providerRef: 'ref',
        },
        ['orderId'],
      );
      expect(order.status).toBe(OrderStatus.PAID);
      expect(orderRepo.save).toHaveBeenCalledWith(order);
    });

    it('maps numeric gRPC status 1 to PAID and updates order', async () => {
      const order = {
        id: orderId,
        status: OrderStatus.PENDING,
      } as Order;
      const orderRepo = {
        findOne: jest.fn().mockResolvedValue(order),
        save: jest.fn().mockImplementation(async (o: Order) => o),
      };
      const paymentsRepo = {
        upsert: jest.fn().mockResolvedValue(undefined),
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Order) return orderRepo;
            if (entity === Payment) return paymentsRepo;
            throw new Error('unexpected entity');
          },
        };
        return cb(manager as never);
      });

      await service.markOrderPaymentResult(orderId, {
        paymentId: null,
        providerRef: null,
        status: 1,
      } as unknown as Parameters<OrdersService['markOrderPaymentResult']>[1]);

      expect(paymentsRepo.upsert).toHaveBeenCalledWith(
        {
          orderId,
          status: PaymentRowStatus.PAID,
          externalPaymentId: null,
          providerRef: null,
        },
        ['orderId'],
      );
      expect(order.status).toBe(OrderStatus.PAID);
    });

    it('does not mark order PAID when payment status is not successful', async () => {
      const order = {
        id: orderId,
        status: OrderStatus.PENDING,
      } as Order;
      const orderRepo = {
        findOne: jest.fn().mockResolvedValue(order),
        save: jest.fn(),
      };
      const paymentsRepo = {
        upsert: jest.fn().mockResolvedValue(undefined),
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Order) return orderRepo;
            if (entity === Payment) return paymentsRepo;
            throw new Error('unexpected entity');
          },
        };
        return cb(manager as never);
      });

      await service.markOrderPaymentResult(orderId, {
        paymentId: 'x',
        providerRef: 'y',
        status: 'PAYMENT_STATUS_PENDING',
      });

      expect(paymentsRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentRowStatus.PENDING }),
        ['orderId'],
      );
      expect(orderRepo.save).not.toHaveBeenCalled();
    });
  });
});
