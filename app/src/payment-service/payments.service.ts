import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

type PaymentRecord = {
  paymentId: string;
  orderId: string;
  status: string;
  providerRef: string;
  failureReason?: string;
};

type AuthorizeResult = {
  paymentId: string;
  status: string;
  message: string;
  providerRef: string;
  schemaVersion: number;
};

@Injectable()
export class PaymentsService {
  private readonly paymentsById = new Map<string, PaymentRecord>();
  private readonly idempotencyResults = new Map<string, AuthorizeResult>();
  private readonly transientFailOnceGate = new Set<string>();

  authorize(input: {
    orderId: string;
    amount: string;
    idempotencyKey?: string;
    paymentMethod?: string;
    simulateUnavailableOnce?: boolean;
  }): AuthorizeResult {
    if (
      input.idempotencyKey &&
      this.idempotencyResults.has(input.idempotencyKey)
    ) {
      return this.idempotencyResults.get(input.idempotencyKey)!;
    }

    const paymentId = randomUUID();
    const providerRef = `${input.paymentMethod ?? 'card'}-${paymentId.slice(0, 8)}`;

    const result: AuthorizeResult = {
      paymentId,
      status: 'PAYMENT_STATUS_AUTHORIZED',
      message: 'Payment authorized',
      providerRef,
      schemaVersion: 2,
    };

    this.paymentsById.set(paymentId, {
      paymentId,
      orderId: input.orderId,
      status: 'PAYMENT_STATUS_AUTHORIZED',
      providerRef,
    });

    if (input.idempotencyKey) {
      this.idempotencyResults.set(input.idempotencyKey, result);
    }

    return result;
  }

  shouldFailTransient(
    orderId: string,
    simulateUnavailableOnce?: boolean,
  ): boolean {
    if (!simulateUnavailableOnce) {
      return false;
    }

    if (this.transientFailOnceGate.has(orderId)) {
      return false;
    }

    this.transientFailOnceGate.add(orderId);
    return true;
  }

  getStatus(paymentId: string): PaymentRecord | null {
    return this.paymentsById.get(paymentId) ?? null;
  }
}
