// apps/api/test/e2e/auth.e2e-spec.ts
/**
 * Auth API E2E Tests
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api ts-node src/database/seed.ts
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=auth
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

const ADMIN_EMAIL    = 'admin@happy-housing.kr';
const ADMIN_PASSWORD = 'Admin@1234';
const INSP_EMAIL     = 'hong@happy-housing.kr';
const INSP_PASSWORD  = 'Inspector@1234';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/v1/auth/login ──────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid ORG_ADMIN credentials and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.user.role).toBe('ORG_ADMIN');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      accessToken  = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should login with INSPECTOR credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: INSP_EMAIL, password: INSP_PASSWORD })
        .expect(200);

      expect(res.body.data.user.role).toBe('INSPECTOR');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'WrongPass!999' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'any' })
        .expect(401);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: ADMIN_PASSWORD })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/v1/auth/me ──────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid access token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.role).toBe('ORG_ADMIN');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer this.is.not.valid')
        .expect(401);
    });
  });

  // ── POST /api/v1/auth/refresh ────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new token pair from valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Rotate tokens for subsequent tests
      refreshToken = res.body.data.refreshToken;
      accessToken  = res.body.data.accessToken;
    });

    it('should return 401 for an already-used (revoked) refresh token', async () => {
      // Get a fresh pair
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: INSP_EMAIL, password: INSP_PASSWORD });

      const rt = loginRes.body.data.refreshToken;

      // First refresh — succeeds and revokes rt
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt })
        .expect(200);

      // Second refresh with same (now revoked) token — must be rejected
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt })
        .expect(401);
    });
  });

  // ── POST /api/v1/auth/logout ─────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should log out (204) and revoke refresh token', async () => {
      // Fresh login
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const at = loginRes.body.data.accessToken;
      const rt = loginRes.body.data.refreshToken;

      // Logout — controller returns 204 NO_CONTENT
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${at}`)
        .send({ refreshToken: rt })
        .expect(204);

      // Revoked token must now return 401
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt })
        .expect(401);
    });
  });
});
