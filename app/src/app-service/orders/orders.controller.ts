import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { AuthorizeOrderDto } from './dto/authorize-order.dto';
import { PaymentsGrpcClient } from '../grpc-client/payments-grpc.client';
import { AuthorizeResponse } from '../grpc-client/interfaces/payments.interface';
import { randomUUID } from 'crypto';

type CreateOrderBody = {
  items: Array<{ productId: string; quantity: number }>;
};

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsGrpcClient: PaymentsGrpcClient,
  ) {}

  @Post()
  async create(
    @Req() req: Request & { user?: any },
    @Body() body: CreateOrderBody,
  ) {
    const items = body?.items ?? [];
    return this.ordersService.createOrder(items);
  }

  @Post(':orderId/pay')
  async payOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AuthorizeOrderDto,
  ): Promise<AuthorizeResponse> {
    const existingOrder = await this.ordersService.findById(orderId);
    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.paymentsGrpcClient.authorize({
      orderId,
      total: {
        amount: dto.amount,
        currency: dto.currency,
      },
      idempotencyKey: dto.idempotencyKey ?? randomUUID(),
      paymentMethod: dto.paymentMethod,
      simulateUnavailableOnce: dto.simulateUnavailableOnce,
      simulateAuthorizeDelayMs: dto.simulateAuthorizeDelayMs,
    });

    await this.ordersService.markOrderPaymentResult(orderId, payment);

    return payment;
  }

  @Get()
  async list() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.ordersService.deleteById(id);
    if (!deleted) {
      throw new NotFoundException('Order not found');
    }
    return { ok: true };
  }
}
