// apps/api/src/modules/rpa/rpa.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  RpaTaskType,
  RpaTaskStatus,
  RPA_AUTOMATION_TARGETS,
  RPA_TASK_TYPE_LABELS,
  CreateRpaTaskInput,
  RpaTaskResult,
  RpaAutomationSummary,
} from '@ax/shared';
import { CouchService } from '../../database/couch.service';
import { RPA_QUEUE } from './rpa.constants';

@Injectable()
export class RpaService {
  private readonly logger = new Logger(RpaService.name);

  constructor(
    @InjectQueue(RPA_QUEUE) private readonly rpaQueue: Queue,
    private readonly couch: CouchService,
  ) {}

  /**
   * RPA 작업 즉시 실행 또는 스케줄 등록
   * AX-SPRINT 목표: 관리비 80% · 계약만료 100% · 민원 70% · 점검일정 90% 자동화
   */
  async enqueue(orgId: string, input: CreateRpaTaskInput): Promise<{ jobId: string; taskType: RpaTaskType }> {
    const job = await this.rpaQueue.add(
      input.taskType,
      { orgId, ...input },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    this.logger.log(`RPA 작업 등록: ${RPA_TASK_TYPE_LABELS[input.taskType]} (jobId=${job.id}, orgId=${orgId})`);
    return { jobId: String(job.id), taskType: input.taskType };
  }

  /**
   * 대시보드용 RPA 자동화 현황 집계
   * - 오늘 실행 건수, 전체 자동화율, 작업 유형별 달성률
   */
  async getAutomationSummary(orgId: string): Promise<RpaAutomationSummary> {
    // TODO: CouchDB에서 rpa-task 문서 집계 후 계산
    // 현재는 목표값 기반 플레이스홀더 반환
    const byTaskType = {} as RpaAutomationSummary['byTaskType'];
    for (const type of Object.values(RpaTaskType)) {
      byTaskType[type] = {
        automationRate: 0,
        target: RPA_AUTOMATION_TARGETS[type],
        lastRunAt: undefined,
      };
    }
    return {
      todayTaskCount: 0,
      overallAutomationRate: 0,
      byTaskType,
      estimatedTimeSavedHours: 0,
    };
  }

  /**
   * 계약 만료 임박 알림 자동 발송 (100% 자동화 목표)
   * Bull Cron으로 매일 09:00 실행
   */
  async scheduleContractExpiryNotices(orgId: string): Promise<void> {
    await this.enqueue(orgId, {
      orgId,
      taskType: RpaTaskType.CONTRACT_EXPIRY_NOTICE,
      triggerNow: false,
      scheduleExpression: '0 9 * * *', // 매일 09:00
    });
  }

  /**
   * 관리비 고지서 자동 생성 (80% 자동화 목표)
   * 매월 1일 실행
   */
  async scheduleBillGeneration(orgId: string, complexId: string): Promise<void> {
    await this.enqueue(orgId, {
      orgId,
      complexId,
      taskType: RpaTaskType.BILL_GENERATION,
      scheduleExpression: '0 8 1 * *', // 매월 1일 08:00
    });
  }
}
