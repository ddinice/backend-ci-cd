import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import {
  firstValueFrom,
  retry,
  throwError,
  timeout,
  timer,
  TimeoutError,
} from 'rxjs';
import { PAYMENTS_SERVICE_NAME } from '../../constants/grpc.constants';
import {
  AuthorizeRequest,
  AuthorizeResponse,
  GetPaymentStatusResponse,
  PaymentsGrpcService,
} from './interfaces/payments.interface';

@Injectable()
export class PaymentsGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(PaymentsGrpcClient.name);
  private paymentsService!: PaymentsGrpcService;

  constructor(
    @Inject('PAYMENTS_GRPC_CLIENT') private readonly client: ClientGrpc,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.logger.log('PaymentsGrpcClient onModuleInit');
    this.paymentsService = this.client.getService<PaymentsGrpcService>(
      PAYMENTS_SERVICE_NAME,
    );
  }

  async authorize(payload: AuthorizeRequest): Promise<AuthorizeResponse> {
    const timeoutMs = Number(
      this.configService.get<string>('PAYMENTS_GRPC_TIMEOUT_MS') ??
        this.configService.get<string>('PAYMENTS_RPC_TIMEOUT_MS') ??
        '1000',
    );
    const maxRetries = Number(
      this.configService.get<string>('PAYMENTS_RPC_MAX_RETRIES') ?? '2',
    );
    const baseBackoffMs = Number(
      this.configService.get<string>('PAYMENTS_RPC_BACKOFF_MS') ?? '150',
    );

    try {
      const result = await firstValueFrom(
        this.paymentsService.Authorize(payload).pipe(
          timeout(timeoutMs),
          retry({
            count: maxRetries,
            delay: (error, retryIndex) => {
              if (!this.isTransient(error)) {
                return throwError(() => error);
              }

              const delayMs = baseBackoffMs * Math.pow(2, retryIndex - 1);
              const code = (error as { code?: number })?.code;
              this.logger.warn(
                `retry authorize attempt=${retryIndex} code=${String(code)} delayMs=${delayMs}`,
              );
              return timer(delayMs);
            },
          }),
        ),
      );
      this.logger.log(
        `authorize ok orderId=${payload.orderId} paymentId=${result.paymentId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`authorize failed orderId=${payload.orderId}`);
      throw this.mapGrpcError(error);
    }
  }

  async getStatus(paymentId: string): Promise<GetPaymentStatusResponse> {
    const timeoutMs = Number(
      this.configService.get<string>('PAYMENTS_GRPC_TIMEOUT_MS') ??
        this.configService.get<string>('PAYMENTS_RPC_TIMEOUT_MS') ??
        '1000',
    );

    try {
      const result = await firstValueFrom(
        this.paymentsService
          .GetPaymentStatus({ paymentId })
          .pipe(timeout(timeoutMs)),
      );
      this.logger.log(`status ok paymentId=${paymentId}`);
      return result;
    } catch (error) {
      this.logger.error(`status failed paymentId=${paymentId}`);
      throw this.mapGrpcError(error);
    }
  }

  private isTransient(error: unknown): boolean {
    const code = (error as { code?: number })?.code;
    return (
      code === GrpcStatus.UNAVAILABLE || code === GrpcStatus.DEADLINE_EXCEEDED
    );
  }

  private mapGrpcError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new GatewayTimeoutException(`Payments timeout: ${error.message}`);
    }

    const code = (error as { code?: number })?.code;
    const details =
      (error as { details?: string; message?: string })?.details ??
      (error as { message?: string })?.message ??
      'unknown grpc error';

    const errorMap = {
      [GrpcStatus.INVALID_ARGUMENT]: new BadRequestException(
        `Payments validation failed: ${details}`,
      ),
      [GrpcStatus.NOT_FOUND]: new NotFoundException(
        `Payment not found: ${details}`,
      ),
      [GrpcStatus.FAILED_PRECONDITION]: new ConflictException(
        `Payment cannot be processed now: ${details}`,
      ),
      [GrpcStatus.DEADLINE_EXCEEDED]: new GatewayTimeoutException(
        `Payments timeout: ${details}`,
      ),
      [GrpcStatus.UNAVAILABLE]: new ServiceUnavailableException(
        `Payments temporarily unavailable: ${details}`,
      ),
    };

    return (
      errorMap[code as keyof typeof errorMap] ??
      new BadGatewayException(`Payments RPC call failed: ${details}`)
    );
  }
}
