// apps/job-worker/src/processors/rpa.processor.ts
// RPA 자동화 프로세서 — 관리비 고지서·계약 만료·민원 자동 분류 (Phase 2 stub)
// RPA_DRY_RUN=true 환경변수 설정 시 실제 발송 없이 로그만 기록
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface RpaBillPayload {
  jobDocId: string;
  orgId: string;
  complexId: string;
  billingMonth: string; // e.g. '2026-04'
}

interface RpaContractExpiryPayload {
  jobDocId: string;
  orgId: string;
  complexId?: string;
  expiryWindowDays: number;
}

interface RpaComplaintIntakePayload {
  jobDocId: string;
  orgId: string;
  complaintId: string;
  complaintText: string;
}

@Processor('job-queue')
export class RpaProcessor {
  private readonly logger = new Logger(RpaProcessor.name);
  private readonly isDryRun = process.env.RPA_DRY_RUN === 'true';

  constructor(private readonly client: JobStatusClient) {}

  // ── 관리비 고지서 생성 (80% 자동화) ────────────────────────────────────
  @Process('RPA_BILL_GENERATION')
  async handleBillGeneration(job: Job<RpaBillPayload>): Promise<void> {
    const { jobDocId, orgId, complexId, billingMonth } = job.data;
    this.logger.log(
      `Processing RPA_BILL_GENERATION: ${jobDocId} [month=${billingMonth}]`,
    );
    if (this.isDryRun) {
      this.logger.warn(`DRY RUN — RPA_BILL_GENERATION skipped for ${complexId}`);
    }

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // 단계 1: 데이터 집계
      await this.delay(600);
      await job.progress(33);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 33 });
      this.logger.debug(`${jobDocId} — 데이터 집계 완료 (33%)`);

      // 단계 2: 고지서 생성
      await this.delay(600);
      await job.progress(66);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 66 });
      this.logger.debug(`${jobDocId} — 고지서 생성 완료 (66%)`);

      // 단계 3: 발송 (DRY RUN이면 스킵)
      await this.delay(600);
      await job.progress(100);
      const sentCount = this.isDryRun ? 0 : 42;
      this.logger.debug(
        `${jobDocId} — ${this.isDryRun ? '[DRY RUN] 발송 스킵' : `고지서 ${sentCount}건 발송`} (100%)`,
      );

      const result = {
        complexId,
        orgId,
        billingMonth,
        billsGenerated: 42,
        billsSent: sentCount,
        dryRun: this.isDryRun,
        completedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(`RPA_BILL_GENERATION completed: ${jobDocId}`);
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      throw err;
    }
  }

  // ── 계약 만료 알림 (100% 자동화) ────────────────────────────────────────
  @Process('RPA_CONTRACT_EXPIRY')
  async handleContractExpiry(job: Job<RpaContractExpiryPayload>): Promise<void> {
    const { jobDocId, orgId, complexId, expiryWindowDays } = job.data;
    this.logger.log(
      `Processing RPA_CONTRACT_EXPIRY: ${jobDocId} [window=${expiryWindowDays}d]`,
    );
    if (this.isDryRun) {
      this.logger.warn(`DRY RUN — RPA_CONTRACT_EXPIRY 알림 발송 스킵`);
    }

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // 단계 1: 만료 목록 조회
      await this.delay(500);
      await job.progress(50);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 50 });
      this.logger.debug(`${jobDocId} — 만료 임박 계약 목록 조회 (50%)`);

      // 단계 2: 알림 발송
      await this.delay(500);
      await job.progress(100);
      const notifiedCount = this.isDryRun ? 0 : 7;
      this.logger.debug(
        `${jobDocId} — ${this.isDryRun ? '[DRY RUN] 알림 발송 스킵' : `알림 ${notifiedCount}건 발송`} (100%)`,
      );

      const result = {
        complexId: complexId ?? 'all',
        orgId,
        expiryWindowDays,
        contractsFound: 7,
        notificationsSent: notifiedCount,
        dryRun: this.isDryRun,
        completedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(`RPA_CONTRACT_EXPIRY completed: ${jobDocId}`);
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      throw err;
    }
  }

  // ── 민원 자동 분류 (70% 자동화) ─────────────────────────────────────────
  @Process('RPA_COMPLAINT_INTAKE')
  async handleComplaintIntake(job: Job<RpaComplaintIntakePayload>): Promise<void> {
    const { jobDocId, orgId, complaintId, complaintText } = job.data;
    this.logger.log(
      `Processing RPA_COMPLAINT_INTAKE: ${jobDocId} [complaintId=${complaintId}]`,
    );

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // 단계 1: AI 분류
      await this.delay(600);
      await job.progress(50);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 50 });
      this.logger.debug(`${jobDocId} — AI 민원 분류 완료 (50%)`);

      // Stub: classify based on keyword presence
      const category = complaintText.includes('균열') || complaintText.includes('누수')
        ? 'FACILITY'
        : complaintText.includes('소음')
        ? 'NOISE'
        : complaintText.includes('주차')
        ? 'PARKING'
        : 'OTHER';
      const confidence = Math.round((Math.random() * 0.2 + 0.75) * 100) / 100;

      // 단계 2: 담당자 배정
      await this.delay(500);
      await job.progress(100);
      if (this.isDryRun) {
        this.logger.warn(`DRY RUN — RPA_COMPLAINT_INTAKE 담당자 배정 스킵`);
      }
      this.logger.debug(`${jobDocId} — 담당자 배정 완료 (100%)`);

      const result = {
        complaintId,
        orgId,
        classifiedCategory: category,
        confidence,
        assignedTeam: this.isDryRun ? null : 'FACILITY_TEAM_A',
        dryRun: this.isDryRun,
        completedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(
        `RPA_COMPLAINT_INTAKE completed: ${jobDocId} category=${category} confidence=${confidence}`,
      );
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      throw err;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
