import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { PaymentsGrpcClient } from '../../src/app-service/grpc-client/payments-grpc.client';
import { OrdersController } from '../../src/app-service/orders/orders.controller';
import { OrdersService } from '../../src/app-service/orders/orders.service';

describe('Smoke: orders HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            createOrder: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn().mockResolvedValue([]),
            deleteById: jest.fn(),
            markOrderPaymentResult: jest.fn(),
          },
        },
        {
          provide: PaymentsGrpcClient,
          useValue: { authorize: jest.fn() },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /orders returns 200 and JSON', async () => {
    await request(app.getHttpServer() as Server)
      .get('/orders')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect([]);
  });
});
