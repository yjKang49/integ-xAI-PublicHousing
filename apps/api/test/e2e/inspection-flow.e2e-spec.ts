// apps/api/test/e2e/inspection-flow.e2e-spec.ts
/**
 * Inspection Flow E2E Test
 * Covers demo scenario steps 2-5:
 *   단지/건물 조회 → 프로젝트 생성 → 세션 생성 → 결함 등록 → 목록 조회
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api ts-node src/database/seed.ts
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=inspection-flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { DefectType, SeverityLevel } from '@ax/shared';

// IDs from seed.ts
const SEED_COMPLEX_ID  = 'housingComplex:org_seed001:cplx_seed01';
const SEED_BLDG_101    = 'building:org_seed001:bldg_101';
const SEED_FLR_101_1F  = 'floor:org_seed001:flr_101_1f';
const SEED_INSP1_ID    = 'user:_platform:usr_insp01';

describe('Inspection Flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let inspectorToken: string;
  let createdProjectId: string;
  let createdSessionId: string;
  let createdDefectId: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@happy-housing.kr', password: 'Admin@1234' });
    adminToken = adminLogin.body.data?.accessToken;

    const inspLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hong@happy-housing.kr', password: 'Inspector@1234' });
    inspectorToken = inspLogin.body.data?.accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  // ── 1. 단지 목록/상세 조회 ───────────────────────────────────────

  describe('GET /api/v1/complexes (단지 목록)', () => {
    it('should return at least the seeded complex', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complexes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return seeded complex by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complexes/${encodeURIComponent(SEED_COMPLEX_ID)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(SEED_COMPLEX_ID);
      expect(res.body.data.name).toBeDefined();
    });
  });

  // ── 2. 건물 목록 조회 ────────────────────────────────────────────
  // BuildingsController: GET /api/v1/buildings?complexId=:id
  // (NOT /complexes/:id/buildings — that route doesn't exist)

  describe('GET /api/v1/buildings?complexId=... (건물 목록)', () => {
    it('should return buildings for the seeded complex', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/buildings?complexId=${encodeURIComponent(SEED_COMPLEX_ID)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 3. 점검 프로젝트 생성 ────────────────────────────────────────

  describe('POST /api/v1/projects (프로젝트 생성)', () => {
    it('should create a new inspection project with status PLANNED', async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          name: `E2E 테스트 점검 ${Date.now()}`,
          round: 99,
          inspectionType: 'REGULAR',
          plannedStartDate: now.toISOString(),
          plannedEndDate: nextWeek.toISOString(),
          leadInspectorId: SEED_INSP1_ID,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PLANNED');
      createdProjectId = res.body.data._id;
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ complexId: SEED_COMPLEX_ID })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should list projects including the newly created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = (res.body.data as any[]).map((p) => p._id);
      expect(ids).toContain(createdProjectId);
    });
  });

  // ── 4. 점검 세션 생성 ────────────────────────────────────────────
  // Session status: DRAFT when no inspectorId, ASSIGNED when inspectorId provided

  describe('POST /api/v1/projects/:projectId/sessions (세션 생성)', () => {
    it('should create a session with status DRAFT (no inspectorId)', async () => {
      if (!createdProjectId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${encodeURIComponent(createdProjectId)}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buildingId: SEED_BLDG_101,
          floorId: SEED_FLR_101_1F,
          notes: 'E2E 테스트 세션 (DRAFT)',
          // No inspectorId → status = DRAFT
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      createdSessionId = res.body.data._id;
    });

    it('should create a session with status ASSIGNED when inspectorId is provided', async () => {
      if (!createdProjectId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${encodeURIComponent(createdProjectId)}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buildingId: SEED_BLDG_101,
          floorId: SEED_FLR_101_1F,
          inspectorId: SEED_INSP1_ID,
          notes: 'E2E 테스트 세션 (ASSIGNED)',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // When inspectorId is provided, status auto-advances to ASSIGNED
      expect(res.body.data.status).toBe('ASSIGNED');
    });
  });

  // ── 5. 결함 등록 ─────────────────────────────────────────────────

  describe('POST /api/v1/defects (결함 등록)', () => {
    it('should create a defect linked to the session', async () => {
      if (!createdProjectId || !createdSessionId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/defects')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          sessionId: createdSessionId,
          projectId: createdProjectId,
          complexId: SEED_COMPLEX_ID,
          buildingId: SEED_BLDG_101,
          floorId: SEED_FLR_101_1F,
          defectType: DefectType.CRACK,
          severity: SeverityLevel.MEDIUM,
          description: 'E2E 테스트 균열 결함',
          locationDescription: '1층 북측 벽면',
          widthMm: 0.8,
          lengthMm: 150,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.defectType).toBe(DefectType.CRACK);
      expect(res.body.data.isRepaired).toBe(false);
      createdDefectId = res.body.data._id;
    });

    it('should retrieve the created defect by ID', async () => {
      if (!createdDefectId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/defects/${encodeURIComponent(createdDefectId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(createdDefectId);
      expect(res.body.data.severity).toBe(SeverityLevel.MEDIUM);
    });

    it('should mark defect as repaired via PATCH', async () => {
      if (!createdDefectId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/defects/${encodeURIComponent(createdDefectId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isRepaired: true, repairNotes: 'E2E 테스트 수리 완료' })
        .expect(200);

      expect(res.body.data.isRepaired).toBe(true);
      expect(res.body.data.repairNotes).toBe('E2E 테스트 수리 완료');
    });
  });

  // ── 6. 결함 목록 필터링 ──────────────────────────────────────────

  describe('GET /api/v1/defects (결함 목록 및 필터)', () => {
    it('should return paginated defect list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/defects?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter defects by severity=CRITICAL', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/defects?severity=${SeverityLevel.CRITICAL}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      (res.body.data as any[]).forEach((d) => {
        expect(d.severity).toBe(SeverityLevel.CRITICAL);
      });
    });

    it('should filter defects by isRepaired=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/defects?isRepaired=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      (res.body.data as any[]).forEach((d) => {
        expect(d.isRepaired).toBe(false);
      });
    });
  });
});
