import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsGrpcController } from './payments.grpc.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'example'}`],
    }),
  ],
  controllers: [PaymentsGrpcController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
