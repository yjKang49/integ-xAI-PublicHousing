// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

import { CouchService } from './database/couch.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health/health.controller';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ComplexesModule } from './modules/complexes/complexes.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { FloorsModule } from './modules/floors/floors.module';
import { ZonesModule } from './modules/zones/zones.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DefectsModule } from './modules/defects/defects.module';
import { MediaModule } from './modules/media/media.module';
import { MarkersModule } from './modules/markers/markers.module';
import { CracksModule } from './modules/cracks/cracks.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { AssetsModule } from './modules/assets/assets.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
// AX-SPRINT 모듈
import { RpaModule } from './modules/rpa/rpa.module';
import { AiInspectionModule } from './modules/ai-inspection/ai-inspection.module';
// Phase 2: 비동기 작업 인프라 + Feature Flag
import { JobsModule } from './modules/jobs/jobs.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
// Phase 2: 드론 미디어 파이프라인
import { DroneMissionsModule } from './modules/drone-missions/drone-missions.module';
import { MediaAnalysisModule } from './modules/media-analysis/media-analysis.module';
// Phase 2: AI 결함 탐지 파이프라인
import { DefectCandidatesModule } from './modules/defect-candidates/defect-candidates.module';
import { AiDetectionsModule } from './modules/ai-detections/ai-detections.module';
// Phase 2: 균열 심층 분석 파이프라인
import { CrackAnalysisModule } from './modules/crack-analysis/crack-analysis.module';
// Phase 2: AI 진단 의견 파이프라인
import { DiagnosisOpinionsModule } from './modules/diagnosis-opinions/diagnosis-opinions.module';
import { RepairRecommendationsModule } from './modules/repair-recommendations/repair-recommendations.module';
// Phase 2-6: 민원 AI 트리아지 파이프라인
import { ComplaintTriageModule } from './modules/complaint-triage/complaint-triage.module';
// Phase 2-7: RPA/업무 자동화 엔진
import { AutomationRulesModule } from './modules/automation-rules/automation-rules.module';
import { AutomationExecutionsModule } from './modules/automation-executions/automation-executions.module';
// Phase 2-8: IoT 센서 연동
import { SensorsModule } from './modules/sensors/sensors.module';
import { SensorReadingsModule } from './modules/sensor-readings/sensor-readings.module';
// Phase 2-9: 예지정비 & 장기수선 의사결정
import { RiskScoringModule } from './modules/risk-scoring/risk-scoring.module';
import { MaintenanceRecommendationsModule } from './modules/maintenance-recommendations/maintenance-recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Rate limiting: 100 req / 60s per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Bull queue (Redis-backed)
    BullModule.forRoot({
      redis: {
        host: (process.env.REDIS_URL ?? 'redis://localhost:6379').replace('redis://', '').split(':')[0],
        port: parseInt((process.env.REDIS_URL ?? 'redis://localhost:6379').split(':')[2] ?? '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Redis (cache + JWT deny-list)
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
        options: {
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),

    // Domain modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ComplexesModule,
    BuildingsModule,
    FloorsModule,
    ZonesModule,
    ProjectsModule,
    DefectsModule,
    MediaModule,
    MarkersModule,
    CracksModule,
    ComplaintsModule,
    SchedulesModule,
    AlertsModule,
    ReportsModule,
    DashboardModule,
    KpiModule,
    AssetsModule,
    WorkOrdersModule,
    // AX-SPRINT: 지능형 행정자동화 + AI 현장점검 10단계
    RpaModule,
    AiInspectionModule,
    // Phase 2: 비동기 작업 큐 + Feature Flag 관리
    JobsModule,
    FeatureFlagsModule,
    // Phase 2: 드론 미디어 파이프라인
    DroneMissionsModule,
    MediaAnalysisModule,
    // Phase 2: AI 결함 탐지 파이프라인
    DefectCandidatesModule,
    AiDetectionsModule,
    // Phase 2: 균열 심층 분석 파이프라인
    CrackAnalysisModule,
    // Phase 2: AI 진단 의견 파이프라인
    DiagnosisOpinionsModule,
    RepairRecommendationsModule,
    // Phase 2-6: 민원 AI 트리아지 파이프라인
    ComplaintTriageModule,
    // Phase 2-7: RPA/업무 자동화 엔진
    AutomationRulesModule,
    AutomationExecutionsModule,
    // Phase 2-8: IoT 센서 연동
    SensorsModule,
    SensorReadingsModule,
    // Phase 2-9: 예지정비 & 장기수선 의사결정
    RiskScoringModule,
    MaintenanceRecommendationsModule,
  ],
  controllers: [HealthController],
  providers: [
    CouchService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [CouchService],
})
export class AppModule {}
