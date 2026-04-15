// apps/ai-worker/src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AiWorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('AiWorker');
  const app = await NestFactory.createApplicationContext(AiWorkerModule);
  app.enableShutdownHooks();
  logger.log('AI Worker started — consuming ai-queue');
}
bootstrap();
