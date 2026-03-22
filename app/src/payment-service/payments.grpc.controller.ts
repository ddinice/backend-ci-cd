import { Controller, Logger } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { PAYMENTS_SERVICE_NAME } from '../constants/grpc.constants';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsGrpcController {
  private readonly logger = new Logger(PaymentsGrpcController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Authorize')
  async authorize(payload: {
    orderId: string;
    total: { amount: string; currency: string };
    idempotencyKey?: string;
    paymentMethod?: string;
    simulateUnavailableOnce?: boolean;
    simulateAuthorizeDelayMs?: number;
    simulate_authorize_delay_ms?: number;
  }) {
    if (!payload.orderId) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'order_id is required',
      });
    }

    const amountValue = Number(payload.total?.amount ?? '');
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'amount must be > 0',
      });
    }

    const delayMs = Math.min(
      Number(
        payload.simulateAuthorizeDelayMs ??
          payload.simulate_authorize_delay_ms ??
          0,
      ),
      10_000,
    );
    if (delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }

    if (
      this.paymentsService.shouldFailTransient(
        payload.orderId,
        payload.simulateUnavailableOnce,
      )
    ) {
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: 'transient provider outage',
      });
    }

    const result = this.paymentsService.authorize({
      orderId: payload.orderId,
      amount: payload.total.amount,
      idempotencyKey: payload.idempotencyKey,
      paymentMethod: payload.paymentMethod,
      simulateUnavailableOnce: payload.simulateUnavailableOnce,
    });
    this.logger.log(
      `authorize orderId=${payload.orderId} paymentId=${result.paymentId}`,
    );
    return result;
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'GetPaymentStatus')
  getPaymentStatus(payload: { paymentId: string }) {
    const payment = this.paymentsService.getStatus(payload.paymentId);

    if (!payment) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'payment not found',
      });
    }

    this.logger.log(`status paymentId=${payload.paymentId}`);
    return payment;
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Capture')
  capture() {
    return {
      ok: true,
      message: 'Capture should be async in production',
    };
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Refund')
  refund() {
    return {
      ok: true,
      message: 'Refund should be async in production',
    };
  }
}
