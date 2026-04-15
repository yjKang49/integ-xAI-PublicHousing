// apps/job-worker/src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { JobWorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('JobWorker');
  const app = await NestFactory.createApplicationContext(JobWorkerModule);
  app.enableShutdownHooks();
  logger.log('Job Worker started — consuming job-queue');
}
bootstrap();
