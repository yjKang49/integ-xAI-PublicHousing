// apps/api/src/modules/rpa/rpa.processor.ts
import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RpaTaskType, RPA_TASK_TYPE_LABELS } from '@ax/shared';
import { RPA_QUEUE } from './rpa.constants';

@Processor(RPA_QUEUE)
export class RpaProcessor {
  private readonly logger = new Logger(RpaProcessor.name);

  /** 관리비 고지서 자동 생성 — 목표: 80% 자동화 */
  @Process(RpaTaskType.BILL_GENERATION)
  async handleBillGeneration(job: Job): Promise<void> {
    this.logger.log(`[RPA] 관리비 고지서 생성 시작 (orgId=${job.data.orgId})`);
    // TODO: 단지별 세대 목록 조회 → Handlebars 템플릿으로 고지서 생성 → S3 저장 → 알림 발송
    await job.progress(100);
  }

  /** 계약 만료 알림 자동 발송 — 목표: 100% 자동화 */
  @Process(RpaTaskType.CONTRACT_EXPIRY_NOTICE)
  async handleContractExpiryNotice(job: Job): Promise<void> {
    this.logger.log(`[RPA] 계약 만료 알림 발송 시작 (orgId=${job.data.orgId})`);
    // TODO: 30일 이내 만료 계약 조회 → 이메일/SMS/앱 푸시 발송 (Nodemailer + Kakao/NHN)
    await job.progress(100);
  }

  /** 민원 접수·AI 자동 분류 — 목표: 70% 자동화 */
  @Process(RpaTaskType.COMPLAINT_INTAKE)
  async handleComplaintIntake(job: Job): Promise<void> {
    this.logger.log(`[RPA] 민원 AI 분류 시작 (complaintId=${job.data.payload?.complaintId})`);
    // TODO: KoELECTRA 민원 텍스트 분류 → category/priority 자동 배정 → 담당자 배정 제안
    // Phase 2: FastAPI AI 마이크로서비스 호출
    await job.progress(100);
  }

  /** 정기 점검 일정 자동 생성 — 목표: 90% 자동화 */
  @Process(RpaTaskType.INSPECTION_SCHEDULE)
  async handleInspectionSchedule(job: Job): Promise<void> {
    this.logger.log(`[RPA] 점검 일정 생성 시작 (orgId=${job.data.orgId})`);
    // TODO: 시설물 등록 기준 → 법정 점검 주기 계산 → InspectionProject 자동 생성
    await job.progress(100);
  }

  /** 안전관리계획 법정 보고 자동 제출 */
  @Process(RpaTaskType.REPORT_SUBMISSION)
  async handleReportSubmission(job: Job): Promise<void> {
    this.logger.log(`[RPA] 법정 보고서 제출 시작 (orgId=${job.data.orgId})`);
    // TODO: XAI 평가 보고서 생성 → Puppeteer PDF → 법정 기관 제출 API 연동
    await job.progress(100);
  }

  /** 클린하우스 마일리지 지급 */
  @Process(RpaTaskType.MILEAGE_GRANT)
  async handleMileageGrant(job: Job): Promise<void> {
    this.logger.log(`[RPA] 마일리지 지급 시작 (orgId=${job.data.orgId})`);
    // TODO: 거주자 참여 진단 결과 → 마일리지 계산 → 지급 처리
    await job.progress(100);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    const label = RPA_TASK_TYPE_LABELS[job.name as RpaTaskType] ?? job.name;
    this.logger.log(`[RPA] 완료: ${label} (jobId=${job.id})`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error): void {
    const label = RPA_TASK_TYPE_LABELS[job.name as RpaTaskType] ?? job.name;
    this.logger.error(`[RPA] 실패: ${label} (jobId=${job.id}) — ${err.message}`);
  }
}
