import { Observable } from 'rxjs';

export interface AuthorizeRequest {
  orderId: string;
  total: {
    amount: string;
    currency: string;
  };
  idempotencyKey?: string;
  paymentMethod?: string;
  simulateUnavailableOnce?: boolean;
  simulateAuthorizeDelayMs?: number;
}

export interface AuthorizeResponse {
  paymentId: string;
  status: number | string;
  message: string;
  providerRef?: string;
  schemaVersion?: number;
}

export interface GetPaymentStatusRequest {
  paymentId: string;
}

export interface GetPaymentStatusResponse {
  paymentId: string;
  status: number | string;
  orderId: string;
  providerRef?: string;
  failureReason?: string;
}

export interface PaymentsGrpcService {
  Authorize(payload: AuthorizeRequest): Observable<AuthorizeResponse>;
  GetPaymentStatus(
    payload: GetPaymentStatusRequest,
  ): Observable<GetPaymentStatusResponse>;
}
