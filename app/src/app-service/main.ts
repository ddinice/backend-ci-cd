import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_SERVICE_PORT', 3022);
  const logger = new Logger();

  await app.listen(port);
  logger.log(`[Service: APP-SERVICE] started on http://localhost:${port}`);
}

void bootstrap();
