// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Swagger 활성화 여부 — SWAGGER_ENABLED=false 로만 끌 수 있음
  // NODE_ENV=production 이어도 명시적으로 끄지 않으면 항상 활성화
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';

  // Security headers
  // Swagger 경로(/api/docs)에는 CSP를 적용하지 않아 Swagger UI 스크립트 허용
  app.use((req: any, res: any, next: any) => {
    if (swaggerEnabled && req.path.startsWith('/api/docs')) {
      return next(); // Swagger 경로 — helmet 건너뜀
    }
    helmet()(req, res, next);
  });
  app.use(compression());

  // CORS — origin을 그대로 반영 (프록시 환경, 터널 등 모든 도메인 허용)
  app.enableCors({
    origin: (origin: any, callback: any) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // API versioning — /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform primitives
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new AuditLogInterceptor());

  // Swagger — SWAGGER_ENABLED=false 환경변수로만 비활성화
  // 로컬·스테이징·NODE_ENV=production 환경 모두 기본 활성화
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('AX 공공임대주택 플랫폼 API')
      .setDescription('AX-based Public Housing Safety Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📚 Swagger UI: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}/api/v1`);
}

bootstrap();
