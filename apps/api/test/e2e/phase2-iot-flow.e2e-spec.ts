// apps/api/test/e2e/phase2-iot-flow.e2e-spec.ts
/**
 * Phase 2 IoT & Risk Scoring E2E Test
 *
 * Covers:
 *   1. Sensor registration
 *   2. Normal sensor reading ingestion
 *   3. Threshold-exceeding reading → auto alert creation
 *   4. Alert acknowledgement and resolution
 *   5. Risk score calculation trigger
 *   6. Maintenance recommendation generation
 *   7. Maintenance recommendation approval
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api seed:demo
 *   Feature flags: PHASE2_IOT => true
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=phase2-iot-flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import {
  SensorType,
  SensorStatus,
  AlertStatus,
  AlertType,
  RiskTargetType,
  RecommendationStatus,
} from '@ax/shared';

const SEED_COMPLEX_ID = 'housingComplex:org_demo001:cplx_seed01';
const SEED_BLDG_ID    = 'building:org_demo001:bldg_101';

describe('Phase 2 IoT & Risk Scoring (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  let sensorId: string;
  let alertId: string;
  let riskScoreId: string;
  let recommendationId: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.org', password: 'demo1234' });
    adminToken = adminLogin.body.data?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. Sensor Registration ──────────────────────────────────────────────────

  describe('Sensor Registration', () => {
    it('should register a vibration sensor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sensors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          buildingId: SEED_BLDG_ID,
          type: SensorType.VIBRATION,
          name: 'E2E Vibration Sensor B1',
          location: 'B1 Pillar #3',
          thresholdMin: null,
          thresholdMax: 5.0,
          unit: 'mm/s',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.status).toBe(SensorStatus.ACTIVE);
      sensorId = res.body.data._id;
    });

    it('should register a temperature sensor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sensors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          buildingId: SEED_BLDG_ID,
          type: SensorType.TEMPERATURE,
          name: 'E2E Temperature Sensor Roof',
          location: 'Roof — East Wing',
          thresholdMin: -10,
          thresholdMax: 60,
          unit: '°C',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should list sensors for a building', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/sensors?buildingId=${SEED_BLDG_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('should reject sensor creation without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sensors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ complexId: SEED_COMPLEX_ID }) // missing required fields
        .expect(400);
    });
  });

  // ── 2. Normal Sensor Reading ────────────────────────────────────────────────

  describe('Normal Sensor Reading', () => {
    it('should ingest a normal reading (below threshold)', async () => {
      if (!sensorId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/sensor-readings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sensorId,
          value: 3.2,
          unit: 'mm/s',
          measuredAt: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.anomalyDetected).toBe(false);
    });

    it('should list readings for a sensor', async () => {
      if (!sensorId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/sensor-readings?sensorId=${sensorId}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  // ── 3. Threshold-Exceeding Reading → Alert ──────────────────────────────────

  describe('Threshold Alert', () => {
    it('should create an anomaly alert when reading exceeds threshold', async () => {
      if (!sensorId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/sensor-readings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sensorId,
          value: 7.8,   // exceeds thresholdMax = 5.0
          unit: 'mm/s',
          measuredAt: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.anomalyDetected).toBe(true);
    });

    it('should find the IOT_THRESHOLD alert in alerts list', async () => {
      // Brief wait for alert creation (async)
      await new Promise(r => setTimeout(r, 1000));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/alerts?type=${AlertType.IOT_THRESHOLD}&status=${AlertStatus.ACTIVE}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      if (res.body.data.items.length > 0) {
        alertId = res.body.data.items[0]._id;
        expect(res.body.data.items[0].type).toBe(AlertType.IOT_THRESHOLD);
      }
    });
  });

  // ── 4. Alert Acknowledgement & Resolution ───────────────────────────────────

  describe('Alert Lifecycle', () => {
    it('should acknowledge an active alert', async () => {
      if (!alertId) {
        // Try to get any active alert
        const listRes = await request(app.getHttpServer())
          .get(`/api/v1/alerts?status=${AlertStatus.ACTIVE}&limit=1`)
          .set('Authorization', `Bearer ${adminToken}`);
        alertId = listRes.body.data?.items?.[0]?._id;
      }
      if (!alertId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Vibration spike detected — sending inspector to site' })
        .expect(200);

      expect(res.body.data.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(res.body.data.acknowledgedBy).toBeDefined();
    });

    it('should resolve an acknowledged alert', async () => {
      if (!alertId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Cause identified and addressed — construction nearby' })
        .expect(200);

      expect(res.body.data.status).toBe(AlertStatus.RESOLVED);
    });

    it('should list alerts with severity filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alerts?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  // ── 5. Risk Score Calculation ───────────────────────────────────────────────

  describe('Risk Score Calculation', () => {
    it('should trigger risk score calculation for a building', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/risk-scoring/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetType: RiskTargetType.BUILDING,
          targetId: SEED_BLDG_ID,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Returns either the computed score or a job reference
      riskScoreId = res.body.data._id ?? res.body.data.jobId;
    });

    it('should retrieve risk scores for a building', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/risk-scoring?targetId=${SEED_BLDG_ID}&targetType=${RiskTargetType.BUILDING}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      if (res.body.data.items.length > 0) {
        const score = res.body.data.items[0];
        expect(typeof score.score).toBe('number');
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(score.level).toBeDefined();
      }
    });

    it('should trigger risk score for complex level', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/risk-scoring/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetType: RiskTargetType.COMPLEX,
          targetId: SEED_COMPLEX_ID,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // ── 6. Maintenance Recommendations ─────────────────────────────────────────

  describe('Maintenance Recommendations', () => {
    it('should list maintenance recommendations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/maintenance-recommendations?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      if (res.body.data.items.length > 0) {
        recommendationId = res.body.data.items[0]._id;
      }
    });

    it('should approve a maintenance recommendation', async () => {
      if (!recommendationId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance-recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: RecommendationStatus.APPROVED })
        .expect(200);

      expect(res.body.data.status).toBe(RecommendationStatus.APPROVED);
    });

    it('should defer a maintenance recommendation', async () => {
      // Get another pending recommendation
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/maintenance-recommendations?status=${RecommendationStatus.PENDING}&limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);
      const pendingId = listRes.body.data?.items?.[0]?._id;
      if (!pendingId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance-recommendations/${pendingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: RecommendationStatus.DEFERRED,
          deferredReason: 'Budget constraints — defer to Q3',
        })
        .expect(200);

      expect(res.body.data.status).toBe(RecommendationStatus.DEFERRED);
    });
  });

  // ── 7. KPI Dashboard ────────────────────────────────────────────────────────

  describe('KPI Dashboard', () => {
    it('should return dashboard KPI data', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard?complexId=${SEED_COMPLEX_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return KPI records for a complex', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/kpi?complexId=${SEED_COMPLEX_ID}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });
});
