// apps/job-worker/src/processors/schedule.processor.ts
// 점검 일정 자동 생성 프로세서 — 단지 현황 분석 → 법정 주기 계산 → 일정 생성 (Phase 2 stub)
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface ScheduleAutoGeneratePayload {
  jobDocId: string;
  orgId: string;
  complexId: string;
  targetYear: number;
  scheduleTypes?: string[]; // e.g. ['SAFETY_INSPECTION', 'FIRE_INSPECTION']
}

interface GeneratedSchedule {
  scheduleType: string;
  scheduledDate: string;
  inspectionCycle: string;
  legalBasis: string;
}

@Processor('job-queue')
export class ScheduleProcessor {
  private readonly logger = new Logger(ScheduleProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('SCHEDULE_AUTO_GENERATE')
  async handleScheduleAutoGenerate(
    job: Job<ScheduleAutoGeneratePayload>,
  ): Promise<void> {
    const { jobDocId, orgId, complexId, targetYear } = job.data;
    this.logger.log(
      `Processing SCHEDULE_AUTO_GENERATE: ${jobDocId} [complex=${complexId} year=${targetYear}]`,
    );

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // 단계 1: 단지 현황 분석
      await this.delay(500);
      await job.progress(33);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 33 });
      this.logger.debug(`${jobDocId} — 단지 현황 분석 (33%)`);

      // 단계 2: 법정 점검 주기 계산
      await this.delay(500);
      await job.progress(66);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 66 });
      this.logger.debug(`${jobDocId} — 법정 점검 주기 계산 (66%)`);

      // 단계 3: 일정 문서 생성
      await this.delay(500);
      await job.progress(100);
      this.logger.debug(`${jobDocId} — 일정 문서 생성 (100%)`);

      // Stub: generate 12 monthly inspection schedules
      const generatedSchedules: GeneratedSchedule[] = [
        {
          scheduleType: 'SAFETY_INSPECTION',
          scheduledDate: `${targetYear}-03-15`,
          inspectionCycle: '연 1회',
          legalBasis: '시설물안전법 제11조',
        },
        {
          scheduleType: 'FIRE_INSPECTION',
          scheduledDate: `${targetYear}-04-20`,
          inspectionCycle: '반기 1회',
          legalBasis: '화재예방법 제22조',
        },
        {
          scheduleType: 'ELEVATOR_INSPECTION',
          scheduledDate: `${targetYear}-02-10`,
          inspectionCycle: '월 1회',
          legalBasis: '승강기안전관리법 제32조',
        },
        {
          scheduleType: 'ELECTRICAL_INSPECTION',
          scheduledDate: `${targetYear}-05-08`,
          inspectionCycle: '연 1회',
          legalBasis: '전기사업법 제63조',
        },
        {
          scheduleType: 'GAS_INSPECTION',
          scheduledDate: `${targetYear}-06-14`,
          inspectionCycle: '연 1회',
          legalBasis: '도시가스사업법 제17조',
        },
        {
          scheduleType: 'WATER_TANK_INSPECTION',
          scheduledDate: `${targetYear}-07-22`,
          inspectionCycle: '반기 1회',
          legalBasis: '수도법 제33조',
        },
        {
          scheduleType: 'CRACK_MONITORING',
          scheduledDate: `${targetYear}-01-15`,
          inspectionCycle: '분기 1회',
          legalBasis: '공동주택관리법 제32조',
        },
        {
          scheduleType: 'CRACK_MONITORING',
          scheduledDate: `${targetYear}-04-15`,
          inspectionCycle: '분기 1회',
          legalBasis: '공동주택관리법 제32조',
        },
        {
          scheduleType: 'CRACK_MONITORING',
          scheduledDate: `${targetYear}-07-15`,
          inspectionCycle: '분기 1회',
          legalBasis: '공동주택관리법 제32조',
        },
        {
          scheduleType: 'CRACK_MONITORING',
          scheduledDate: `${targetYear}-10-15`,
          inspectionCycle: '분기 1회',
          legalBasis: '공동주택관리법 제32조',
        },
        {
          scheduleType: 'DRAINAGE_INSPECTION',
          scheduledDate: `${targetYear}-08-05`,
          inspectionCycle: '연 1회',
          legalBasis: '하수도법 제27조',
        },
        {
          scheduleType: 'SEISMIC_INSPECTION',
          scheduledDate: `${targetYear}-09-17`,
          inspectionCycle: '5년 1회',
          legalBasis: '지진·화산재해대책법 제25조',
        },
      ];

      const result = {
        complexId,
        orgId,
        targetYear,
        schedulesCreated: generatedSchedules.length,
        schedules: generatedSchedules,
        generatedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(
        `SCHEDULE_AUTO_GENERATE completed: ${jobDocId} schedulesCreated=${generatedSchedules.length}`,
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
