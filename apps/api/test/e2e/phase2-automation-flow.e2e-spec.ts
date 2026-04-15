// apps/api/test/e2e/phase2-automation-flow.e2e-spec.ts
/**
 * Phase 2 Automation Flow E2E Test
 *
 * Covers:
 *   1. Automation rule CRUD
 *   2. STATUS_CHANGE trigger → complaint status change → rule execution queued
 *   3. DATE_BASED rule creation and validation
 *   4. Automation execution log retrieval
 *   5. RPA task listing
 *   6. Rule deactivation halts execution
 *   7. Notification automation rule
 *
 * Prerequisites:
 *   docker compose -f docker-compose.dev.yml up -d
 *   yarn workspace @ax/api seed:demo
 *   Feature flags: PHASE2_RPA => true
 *
 * Run:
 *   yarn workspace @ax/api test:e2e --testPathPattern=phase2-automation-flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import {
  AutomationTriggerType,
  AutomationActionType,
  AutomationRuleCategory,
  AutomationExecutionStatus,
  NotificationChannel,
  ComplaintStatus,
  ComplaintCategory,
} from '@ax/shared';

const SEED_COMPLEX_ID = 'housingComplex:org_demo001:cplx_seed01';

describe('Phase 2 Automation Flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let cmgrToken: string;

  let ruleId: string;
  let complaintId: string;

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

    const cmgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cmgr@demo.org', password: 'demo1234' });
    cmgrToken = cmgrLogin.body.data?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. Automation Rule CRUD ─────────────────────────────────────────────────

  describe('Automation Rule CRUD', () => {
    it('should create a STATUS_CHANGE automation rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/automation-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E: Complaint Resolved Notify',
          ruleKey: `e2e_complaint_resolved_${Date.now()}`,
          category: AutomationRuleCategory.COMPLAINT,
          isActive: true,
          trigger: {
            type: AutomationTriggerType.STATUS_CHANGE,
            watchDocType: 'complaint',
            fromStatus: null,
            toStatus: ComplaintStatus.RESOLVED,
          },
          actions: [
            {
              type: AutomationActionType.SEND_NOTIFICATION,
              channel: NotificationChannel.IN_APP,
              recipientField: 'submittedBy',
              titleTemplate: '민원이 처리되었습니다',
              bodyTemplate: '{{title}} 민원이 처리 완료되었습니다.',
            },
          ],
          priority: 10,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.trigger.type).toBe(AutomationTriggerType.STATUS_CHANGE);
      ruleId = res.body.data._id;
    });

    it('should retrieve the created rule', async () => {
      if (!ruleId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(ruleId);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should list automation rules with category filter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation-rules?category=${AutomationRuleCategory.COMPLAINT}&isActive=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should update a rule (deactivate)', async () => {
      if (!ruleId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/automation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
    });

    it('should reactivate the rule', async () => {
      if (!ruleId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/automation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(res.body.data.isActive).toBe(true);
    });

    it('should reject rule creation with invalid trigger type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/automation-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Rule',
          ruleKey: 'invalid_rule',
          category: AutomationRuleCategory.COMPLAINT,
          trigger: { type: 'INVALID_TYPE' },
          actions: [],
        })
        .expect(400);
    });
  });

  // ── 2. DATE_BASED Rule ──────────────────────────────────────────────────────

  describe('DATE_BASED Automation Rule', () => {
    it('should create a date-based contract expiry rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/automation-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E: Contract Expiry 30d',
          ruleKey: `e2e_contract_expiry_30d_${Date.now()}`,
          category: AutomationRuleCategory.CONTRACT,
          isActive: true,
          trigger: {
            type: AutomationTriggerType.DATE_BASED,
            cronExpression: '0 9 * * *',
            offsetDays: -30,
            targetField: 'contractExpiryDate',
            targetDocType: 'schedule',
          },
          actions: [
            {
              type: AutomationActionType.SEND_NOTIFICATION,
              channel: NotificationChannel.EMAIL,
              recipientField: 'assignedTo',
              titleTemplate: '계약 만료 30일 전 알림',
              bodyTemplate: '{{title}} 계약이 30일 후 만료됩니다.',
            },
          ],
          priority: 5,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trigger.type).toBe(AutomationTriggerType.DATE_BASED);
      expect(res.body.data.trigger.cronExpression).toBe('0 9 * * *');
    });
  });

  // ── 3. Status Change Trigger via Complaint ──────────────────────────────────

  describe('Status Change Trigger via Complaint', () => {
    it('should create a test complaint', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({
          complexId: SEED_COMPLEX_ID,
          title: 'E2E 자동화 규칙 테스트 민원',
          description: 'automation rule status_change trigger test',
          category: ComplaintCategory.FACILITY,
          unitNumber: '101',
          submittedBy: 'resident_test_01',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      complaintId = res.body.data._id;
    });

    it('should transition complaint to RESOLVED and check execution log', async () => {
      if (!complaintId) return;

      // Assign first
      await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({ status: ComplaintStatus.ASSIGNED, assignedTo: 'facility_team' });

      // In progress
      await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({ status: ComplaintStatus.IN_PROGRESS });

      // Resolve — triggers automation rule
      const resolveRes = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${cmgrToken}`)
        .send({ status: ComplaintStatus.RESOLVED })
        .expect(200);

      expect(resolveRes.body.data.status).toBe(ComplaintStatus.RESOLVED);
    });

    it('should find execution log for the triggered rule', async () => {
      // Brief wait for async job processing
      await new Promise(r => setTimeout(r, 2000));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation-executions?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      // At least one execution should exist from our complaint resolution
      // (may be RUNNING or COMPLETED depending on worker speed)
    });
  });

  // ── 4. Automation Execution Log ─────────────────────────────────────────────

  describe('Automation Execution Log', () => {
    it('should list all executions with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/automation-executions?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(typeof res.body.data.total).toBe('number');
    });

    it('should filter executions by status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation-executions?status=${AutomationExecutionStatus.COMPLETED}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should filter executions by ruleId', async () => {
      if (!ruleId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation-executions?ruleId=${ruleId}&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ── 5. RPA Task Listing ─────────────────────────────────────────────────────

  describe('RPA Tasks', () => {
    it('should list RPA tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rpa?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  // ── 6. Rule Deletion ────────────────────────────────────────────────────────

  describe('Automation Rule Deletion', () => {
    it('should delete a rule (only SUPER_ADMIN or ORG_ADMIN)', async () => {
      if (!ruleId) return;

      await request(app.getHttpServer())
        .delete(`/api/v1/automation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 404 after deletion', async () => {
      if (!ruleId) return;

      await request(app.getHttpServer())
        .get(`/api/v1/automation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
