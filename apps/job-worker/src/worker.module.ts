// apps/job-worker/src/worker.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { JobStatusClient } from './job-status.client';
import { ReportProcessor } from './processors/report.processor';
import { RpaProcessor } from './processors/rpa.processor';
import { ScheduleProcessor } from './processors/schedule.processor';
// Phase 2: 드론 미디어 파이프라인
import { ExtractVideoFramesProcessor } from './processors/extract-video-frames.processor';
import { ExtractImageMetadataProcessor } from './processors/extract-image-metadata.processor';
// Phase 2-7: RPA/업무 자동화 엔진
import { AutomationRuleProcessor } from './processors/automation-rule.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { RuleEvaluatorService } from './services/rule-evaluator.service';
// Phase 2-9: 예지정비 & 장기수선 의사결정
import { RiskScoreCalculationProcessor } from './processors/risk-score-calculation.processor';
import { MaintenanceRecommendationProcessor } from './processors/maintenance-recommendation.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRoot({
      redis: {
        host: (process.env.REDIS_URL ?? 'redis://localhost:6379')
          .replace(/^redis:\/\//, '')
          .split(':')[0],
        port: parseInt(
          (process.env.REDIS_URL ?? 'redis://localhost:6379').split(':')[2] ?? '6379',
          10,
        ),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    BullModule.registerQueue({ name: 'job-queue' }),
  ],
  providers: [
    JobStatusClient,
    ReportProcessor,
    RpaProcessor,
    ScheduleProcessor,
    ExtractVideoFramesProcessor,
    ExtractImageMetadataProcessor,
    // Phase 2-7: RPA/업무 자동화 엔진
    RuleEvaluatorService,
    AutomationRuleProcessor,
    NotificationProcessor,
    // Phase 2-9: 예지정비 & 장기수선 의사결정
    RiskScoreCalculationProcessor,
    MaintenanceRecommendationProcessor,
  ],
})
export class JobWorkerModule {}
