// apps/api/test/e2e/complaint-flow.e2e-spec.ts
/**
 * Complaint Flow E2E Test
 * Covers demo scenario step 6:
 *   민원 등록(OPEN) → 목록/필터 조회 → 담당자 배정(ASSIGNED) →
 *   처리 중(IN_PROGRESS) → 완료(RESOLVED)
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api ts-node src/database/seed.ts
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=complaint-flow
 *
 * Status transitions (from complaints.service.ts):
 *   OPEN → TRIAGED | ASSIGNED | CLOSED
 *   ASSIGNED → IN_PROGRESS | OPEN | CLOSED
 *   IN_PROGRESS → RESOLVED | ASSIGNED
 *   RESOLVED → CLOSED
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ComplaintCategory, ComplaintStatus } from '@ax/shared';

const SEED_COMPLEX_ID  = 'housingComplex:org_seed001:cplx_seed01';
const SEED_BLDG_101    = 'building:org_seed001:bldg_101';
const CMGR_ID          = 'user:_platform:usr_cmgr01';

// Complaint initial status set by complaints.service.ts create():
//   complaint.status = ComplaintStatus.OPEN  ('OPEN')
// Note: ComplaintStatus.RECEIVED ('RECEIVED') exists for backwards compat
//       but is NOT the initial status for newly created complaints.
const INITIAL_COMPLAINT_STATUS = ComplaintStatus.OPEN;

describe('Complaint Flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let cmgrToken: string;
  let createdComplaintId: string;

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

    const cmgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'park@happy-housing.kr', password: 'Cmgr@1234' });
    cmgrToken = cmgrLogin.body.data?.accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  // ── 1. 민원 등록 ─────────────────────────────────────────────────

  describe('POST /api/v1/complaints (민원 등록)', () => {
    it('should create a new complaint with initial status OPEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          buildingId: SEED_BLDG_101,
          unitNumber: '101호',
          category: ComplaintCategory.NOISE,
          title: 'E2E 층간소음 민원',
          description: '윗집에서 저녁마다 소음이 심합니다.',
          submittedBy: '홍길동',
          submittedPhone: '010-1234-5678',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Service sets initial status to OPEN (not RECEIVED)
      expect(res.body.data.status).toBe(INITIAL_COMPLAINT_STATUS);
      expect(res.body.data.category).toBe(ComplaintCategory.NOISE);
      createdComplaintId = res.body.data._id;
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({ complexId: SEED_COMPLEX_ID })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 403 for INSPECTOR role (not allowed to create complaints)', async () => {
      const inspLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'hong@happy-housing.kr', password: 'Inspector@1234' });
      const inspToken = inspLogin.body.data?.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${inspToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          category: ComplaintCategory.FACILITY,
          title: '무단 민원',
          description: '권한 없음',
          submittedBy: '홍철수',
        })
        .expect(403);
    });
  });

  // ── 2. 민원 목록 조회 ────────────────────────────────────────────

  describe('GET /api/v1/complaints (민원 목록)', () => {
    it('should return paginated complaint list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should include the newly created complaint in the list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?limit=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = (res.body.data as any[]).map((c) => c._id);
      if (createdComplaintId) {
        expect(ids).toContain(createdComplaintId);
      }
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter complaints by status=OPEN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complaints?status=${ComplaintStatus.OPEN}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      (res.body.data as any[]).forEach((c) => {
        expect(c.status).toBe(ComplaintStatus.OPEN);
      });
    });

    it('should filter overdueOnly complaints without crashing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?overdueOnly=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ── 3. 민원 상태 전환: OPEN → ASSIGNED → IN_PROGRESS → RESOLVED ─

  describe('PATCH /api/v1/complaints/:id (민원 처리 흐름)', () => {
    it('OPEN → ASSIGNED: assign complaint to a handler', async () => {
      if (!createdComplaintId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${encodeURIComponent(createdComplaintId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ComplaintStatus.ASSIGNED,
          assignedTo: CMGR_ID,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      expect(res.body.data.status).toBe(ComplaintStatus.ASSIGNED);
      expect(res.body.data.assignedTo).toBe(CMGR_ID);
    });

    it('ASSIGNED → IN_PROGRESS: transition to in-progress', async () => {
      if (!createdComplaintId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${encodeURIComponent(createdComplaintId)}`)
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({
          status: ComplaintStatus.IN_PROGRESS,
          notes: '현장 확인 후 소음 원인 파악 중',
        })
        .expect(200);

      expect(res.body.data.status).toBe(ComplaintStatus.IN_PROGRESS);
    });

    it('IN_PROGRESS → RESOLVED: resolve with notes', async () => {
      if (!createdComplaintId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${encodeURIComponent(createdComplaintId)}`)
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({
          status: ComplaintStatus.RESOLVED,
          resolutionNotes: '층간소음 완충재 설치 완료. 민원인 확인 후 종결',
          satisfactionScore: 4,
        })
        .expect(200);

      expect(res.body.data.status).toBe(ComplaintStatus.RESOLVED);
      expect(res.body.data.resolutionNotes).toContain('층간소음');
    });

    it('should return 404 for unknown complaint ID', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/complaints/complaint:org_seed001:nonexistent000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ComplaintStatus.ASSIGNED })
        .expect(404);
    });
  });

  // ── 4. 대시보드 KPI 구조 검증 ────────────────────────────────────

  describe('GET /api/v1/dashboard (KPI 필드 존재 검증)', () => {
    it('should return dashboard with all required KPI fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const d = res.body.data;
      // Risk summary
      expect(typeof d.criticalDefects).toBe('number');
      expect(typeof d.highDefects).toBe('number');
      expect(typeof d.unrepairedDefects).toBe('number');
      expect(typeof d.activeAlerts).toBe('number');
      // Complaint summary
      expect(typeof d.pendingComplaints).toBe('number');
      expect(typeof d.overdueComplaints).toBe('number');
      expect(typeof d.avgResolutionHours).toBe('number');
      // Inspection summary
      expect(typeof d.activeProjects).toBe('number');
      // KPI rates
      expect(typeof d.complaintResolutionRate).toBe('number');
      expect(typeof d.inspectionCompletionRate).toBe('number');
      expect(typeof d.defectRepairRate).toBe('number');
      // Crack monitoring
      expect(typeof d.crackAlertCount).toBe('number');
      expect(typeof d.preventiveMaintenanceSavingsEstimate).toBe('number');
      // Arrays
      expect(Array.isArray(d.recentAlerts)).toBe(true);
      expect(Array.isArray(d.recentComplaints)).toBe(true);
      expect(Array.isArray(d.defectsByType)).toBe(true);
      expect(Array.isArray(d.crackTrendSummary)).toBe(true);
    });

    it('KPI rates should be 0–100', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const d = res.body.data;
      expect(d.complaintResolutionRate).toBeGreaterThanOrEqual(0);
      expect(d.complaintResolutionRate).toBeLessThanOrEqual(100);
      expect(d.inspectionCompletionRate).toBeGreaterThanOrEqual(0);
      expect(d.inspectionCompletionRate).toBeLessThanOrEqual(100);
      expect(d.defectRepairRate).toBeGreaterThanOrEqual(0);
      expect(d.defectRepairRate).toBeLessThanOrEqual(100);
    });
  });
});
