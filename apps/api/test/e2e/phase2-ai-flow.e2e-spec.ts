// apps/api/test/e2e/phase2-ai-flow.e2e-spec.ts
/**
 * Phase 2 AI Pipeline E2E Test
 *
 * Covers:
 *   1. Drone mission creation + media upload
 *   2. AI defect detection trigger → job queued
 *   3. Defect candidate review (approve / reject)
 *   4. Defect candidate promotion to defect
 *   5. AI diagnosis opinion request → job queued
 *   6. Diagnosis opinion review workflow (DRAFT → APPROVED)
 *   7. Crack analysis trigger → job queued
 *   8. Feature flag gate: AI off → 403
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api seed:demo
 *   Feature flags: PHASE2_AI, PHASE2_DRONE, AI_DEFECT_DETECTION,
 *                  AI_CRACK_ANALYSIS, AI_DIAGNOSIS_OPINION  => true
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=phase2-ai-flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import {
  CandidateReviewStatus,
  DiagnosisOpinionStatus,
} from '@ax/shared';

const SEED_COMPLEX_ID = 'housingComplex:org_demo001:cplx_seed01';
const SEED_BLDG_ID    = 'building:org_demo001:bldg_101';

describe('Phase 2 AI Pipeline (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let inspectorToken: string;
  let reviewerToken: string;

  let missionId: string;
  let mediaItemId: string;
  let candidateId: string;
  let defectId: string;
  let diagnosisOpinionId: string;

  // ── bootstrap ──────────────────────────────────────────────────────────────

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

    // Obtain tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.org', password: 'demo1234' });
    adminToken = adminLogin.body.data?.accessToken;

    const inspectorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inspector@demo.org', password: 'demo1234' });
    inspectorToken = inspectorLogin.body.data?.accessToken;

    const reviewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reviewer@demo.org', password: 'demo1234' });
    reviewerToken = reviewerLogin.body.data?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. Drone Mission ────────────────────────────────────────────────────────

  describe('Drone Mission', () => {
    it('should create a drone mission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/drone-missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          buildingId: SEED_BLDG_ID,
          pilotName: 'E2E Test Pilot',
          scheduledAt: new Date().toISOString(),
          notes: 'Phase 2 AI flow e2e test mission',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      missionId = res.body.data._id;
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/drone-missions')
        .send({ complexId: SEED_COMPLEX_ID })
        .expect(401);
    });
  });

  // ── 2. AI Defect Detection Trigger ─────────────────────────────────────────

  describe('AI Defect Detection', () => {
    it('should trigger AI detection for a mission', async () => {
      if (!missionId) return; // skip if mission creation failed

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai-detections/missions/${missionId}/trigger`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      // Job is queued — jobId is returned
      expect(res.body.data.jobId ?? res.body.data._id).toBeDefined();
    });

    it('should list defect candidates for a mission', async () => {
      if (!missionId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/ai-detections/missions/${missionId}/candidates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should return detection stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai-detections/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalCandidates).toBe('number');
    });
  });

  // ── 3. Defect Candidate Review ─────────────────────────────────────────────

  describe('Defect Candidate Review', () => {
    beforeAll(async () => {
      // Create a candidate directly via seed data or API
      const res = await request(app.getHttpServer())
        .get('/api/v1/defect-candidates?reviewStatus=PENDING&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      candidateId = res.body.data?.items?.[0]?._id;
    });

    it('should list pending candidates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/defect-candidates?reviewStatus=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should approve a candidate and promote to defect', async () => {
      if (!candidateId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/defect-candidates/${candidateId}/review`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          reviewStatus: CandidateReviewStatus.APPROVED,
          reviewComment: 'Confirmed external wall crack — E2E test',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe(CandidateReviewStatus.APPROVED);
      defectId = res.body.data.promotedDefectId;
    });

    it('should reject a candidate', async () => {
      // Create a second pending candidate first (or use seeded data)
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/defect-candidates?reviewStatus=PENDING&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      const rejectId = listRes.body.data?.items?.[0]?._id;
      if (!rejectId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/defect-candidates/${rejectId}/review`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          reviewStatus: CandidateReviewStatus.REJECTED,
          reviewComment: 'Light reflection artifact — not a defect',
        })
        .expect(200);

      expect(res.body.data.reviewStatus).toBe(CandidateReviewStatus.REJECTED);
    });
  });

  // ── 4. Defect Verification ──────────────────────────────────────────────────

  describe('Promoted Defect', () => {
    it('should find the promoted defect in defects list', async () => {
      if (!defectId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/defects/${defectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(defectId);
      expect(res.body.data.severity).toBeDefined();
    });
  });

  // ── 5. AI Diagnosis Opinion ─────────────────────────────────────────────────

  describe('AI Diagnosis Opinion', () => {
    it('should trigger diagnosis opinion generation', async () => {
      if (!defectId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/diagnosis-opinions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetType: 'DEFECT',
          defectIds: [defectId],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      diagnosisOpinionId = res.body.data._id ?? res.body.data.jobId;
    });

    it('should list diagnosis opinions with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/diagnosis-opinions?status=DRAFT&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should approve a diagnosis opinion (REVIEWER only)', async () => {
      // Fetch latest DRAFT opinion
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/diagnosis-opinions?status=DRAFT&limit=1')
        .set('Authorization', `Bearer ${reviewerToken}`);
      const draftId = listRes.body.data?.items?.[0]?._id;
      if (!draftId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/diagnosis-opinions/${draftId}/review`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ status: DiagnosisOpinionStatus.APPROVED })
        .expect(200);

      expect(res.body.data.status).toBe(DiagnosisOpinionStatus.APPROVED);
      expect(res.body.data.reviewedBy).toBeDefined();
    });

    it('should reject a diagnosis opinion with reason', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/diagnosis-opinions?status=DRAFT&limit=1')
        .set('Authorization', `Bearer ${reviewerToken}`);
      const draftId = listRes.body.data?.items?.[0]?._id;
      if (!draftId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/diagnosis-opinions/${draftId}/review`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          status: DiagnosisOpinionStatus.REJECTED,
          reviewComment: 'Insufficient data — request re-analysis with additional images',
        })
        .expect(200);

      expect(res.body.data.status).toBe(DiagnosisOpinionStatus.REJECTED);
    });

    it('should forbid INSPECTOR from approving diagnosis opinion', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/diagnosis-opinions?status=DRAFT&limit=1')
        .set('Authorization', `Bearer ${reviewerToken}`);
      const draftId = listRes.body.data?.items?.[0]?._id;
      if (!draftId) return;

      await request(app.getHttpServer())
        .patch(`/api/v1/diagnosis-opinions/${draftId}/review`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ status: DiagnosisOpinionStatus.APPROVED })
        .expect(403);
    });
  });

  // ── 6. Crack Analysis ───────────────────────────────────────────────────────

  describe('Crack Analysis', () => {
    it('should trigger crack analysis job', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/crack-analysis/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buildingId: SEED_BLDG_ID,
          imageStorageKey: 'demo-assets/crack-sample.jpg',
          notes: 'E2E crack analysis test',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should list crack analysis results', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/crack-analysis?buildingId=${SEED_BLDG_ID}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  // ── 7. Feature Flag Gate ────────────────────────────────────────────────────

  describe('Feature Flag Enforcement', () => {
    it('should disable AI features via flag and block trigger', async () => {
      // Disable AI flag
      await request(app.getHttpServer())
        .patch('/api/v1/feature-flags/AI_DEFECT_DETECTION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(200);

      // Attempt AI trigger — should be blocked
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai-detections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ imageStorageKey: 'test.jpg', buildingId: SEED_BLDG_ID })
        .expect(res => {
          // Expect either 403 (forbidden) or 400 (flag disabled)
          expect([400, 403]).toContain(res.status);
        });

      // Re-enable for subsequent tests
      await request(app.getHttpServer())
        .patch('/api/v1/feature-flags/AI_DEFECT_DETECTION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });
    });
  });
});
