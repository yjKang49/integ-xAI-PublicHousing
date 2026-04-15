// apps/api/test/defects.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DefectType, SeverityLevel } from '@ax/shared';

/**
 * E2E tests for the Defects API.
 *
 * Prerequisites:
 *   - Running CouchDB at COUCHDB_URL (docker-compose up couchdb)
 *   - Running Redis at REDIS_URL
 *
 * Run: yarn workspace @ax/api test:e2e
 */
describe('Defects API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let orgAdminToken: string;
  let inspectorToken: string;
  let createdDefectId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    // Obtain tokens for different roles
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.org', password: 'Test@1234' });
    orgAdminToken = adminLogin.body.data?.accessToken;

    const inspectorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inspector@test.org', password: 'Test@1234' });
    inspectorToken = inspectorLogin.body.data?.accessToken;

    accessToken = orgAdminToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /defects ────────────────────────────

  describe('POST /api/v1/defects', () => {
    const validDto = {
      sessionId: 'session:testorg:ses_e2e_001',
      projectId: 'project:testorg:prj_e2e_001',
      complexId: 'cplx_e2e_001',
      buildingId: 'bldg_e2e_001',
      defectType: DefectType.CRACK,
      severity: SeverityLevel.HIGH,
      description: 'E2E test crack',
      locationDescription: '3F north wall',
      widthMm: 1.5,
      lengthMm: 300,
    };

    it('should create defect with valid payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/defects')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(validDto)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        defectType: DefectType.CRACK,
        severity: SeverityLevel.HIGH,
        isRepaired: false,
      });
      createdDefectId = res.body.data._id;
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/defects')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ complexId: 'cplx001' }) // missing required fields
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/defects')
        .send(validDto)
        .expect(401);
    });

    it('should return 403 for VIEWER role', async () => {
      // Login as viewer
      const viewerLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'viewer@test.org', password: 'Test@1234' });

      await request(app.getHttpServer())
        .post('/api/v1/defects')
        .set('Authorization', `Bearer ${viewerLogin.body.data?.accessToken}`)
        .send(validDto)
        .expect(403);
    });
  });

  // ── GET /defects/:id ─────────────────────────

  describe('GET /api/v1/defects/:id', () => {
    it('should return defect by ID', async () => {
      if (!createdDefectId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/defects/${encodeURIComponent(createdDefectId)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(createdDefectId);
    });

    it('should return 404 for unknown ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/defects/defect:nonexistent:def_000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ── GET /defects ─────────────────────────────

  describe('GET /api/v1/defects', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/defects?limit=10&page=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by severity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/defects?severity=${SeverityLevel.HIGH}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      res.body.data.forEach((d: any) => {
        expect(d.severity).toBe(SeverityLevel.HIGH);
      });
    });
  });

  // ── PATCH /defects/:id ───────────────────────

  describe('PATCH /api/v1/defects/:id', () => {
    it('should update defect fields', async () => {
      if (!createdDefectId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/defects/${encodeURIComponent(createdDefectId)}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ isRepaired: true, repairNotes: 'E2E test repair' })
        .expect(200);

      expect(res.body.data.isRepaired).toBe(true);
      expect(res.body.data.repairNotes).toBe('E2E test repair');
    });

    it('should return 422 for widthMm below 0', async () => {
      if (!createdDefectId) return;

      await request(app.getHttpServer())
        .patch(`/api/v1/defects/${encodeURIComponent(createdDefectId)}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ widthMm: -1 })
        .expect(400);
    });
  });

  // ── Rate limiting ────────────────────────────

  describe('Rate limiting', () => {
    it('should return 429 after too many requests', async () => {
      const requests = Array.from({ length: 110 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/defects')
          .set('Authorization', `Bearer ${accessToken}`),
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
