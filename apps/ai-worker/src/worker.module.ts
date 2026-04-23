// apps/ai-worker/src/worker.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { JobStatusClient } from './job-status.client';
import { AiInspectionProcessor } from './processors/ai-inspection.processor';
import { CrackMeasurementProcessor } from './processors/crack-measurement.processor';
import { DroneVideoProcessor } from './processors/drone-video.processor';
import { DefectDetectionProcessor } from './processors/defect-detection.processor';
import { VISION_INFERENCE_ADAPTER } from './adapters/vision-inference.adapter';
import { MockVisionInferenceAdapter } from './adapters/mock-vision-inference.adapter';
import { CrackAnalysisProcessor } from './processors/crack-analysis.processor';
import { CRACK_ANALYSIS_ADAPTER } from './adapters/crack-analysis.adapter';
import { MockCrackAnalysisAdapter } from './adapters/mock-crack-analysis.adapter';
import { DiagnosisOpinionProcessor } from './processors/diagnosis-opinion.processor';
import { LLM_DIAGNOSIS_ADAPTER } from './adapters/llm-diagnosis.adapter';
import { MockLlmDiagnosisAdapter } from './adapters/mock-llm-diagnosis.adapter';
import { ComplaintTriageProcessor } from './processors/complaint-triage.processor';
import { COMPLAINT_TRIAGE_ADAPTER } from './adapters/complaint-triage.adapter';
import { MockComplaintTriageAdapter } from './adapters/mock-complaint-triage.adapter';

// Render Managed Redis: redis://user:pass@host:port — URL 파싱으로 안전 추출
function parseRedisConn(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password:
      process.env.REDIS_PASSWORD ||
      (u.password ? decodeURIComponent(u.password) : undefined),
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRoot({
      redis: parseRedisConn(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    }),

    BullModule.registerQueue({ name: 'ai-queue' }),
  ],
  providers: [
    JobStatusClient,
    AiInspectionProcessor,
    CrackMeasurementProcessor,
    DroneVideoProcessor,
    DefectDetectionProcessor,
    // Vision Inference Adapter — MOCK이 기본값. 실제 모델 교체 시 아래 줄만 변경:
    // { provide: VISION_INFERENCE_ADAPTER, useClass: MaskRcnnAdapter }
    // { provide: VISION_INFERENCE_ADAPTER, useClass: YMaskNetAdapter }
    { provide: VISION_INFERENCE_ADAPTER, useClass: MockVisionInferenceAdapter },
    CrackAnalysisProcessor,
    // Crack Analysis Adapter — MOCK이 기본값. 실제 OpenCV 교체 시 아래 줄만 변경:
    // { provide: CRACK_ANALYSIS_ADAPTER, useClass: OpenCvWasmAdapter }
    { provide: CRACK_ANALYSIS_ADAPTER, useClass: MockCrackAnalysisAdapter },
    DiagnosisOpinionProcessor,
    // LLM Diagnosis Adapter — MOCK이 기본값. 실제 LLM 교체 시 아래 줄만 변경:
    // { provide: LLM_DIAGNOSIS_ADAPTER, useClass: OpenAiDiagnosisAdapter }
    // { provide: LLM_DIAGNOSIS_ADAPTER, useClass: ClaudeDiagnosisAdapter }
    { provide: LLM_DIAGNOSIS_ADAPTER, useClass: MockLlmDiagnosisAdapter },
    ComplaintTriageProcessor,
    // Complaint Triage Adapter — MOCK이 기본값. 실제 LLM 교체 시 아래 줄만 변경:
    // { provide: COMPLAINT_TRIAGE_ADAPTER, useClass: ClaudeComplaintTriageAdapter }
    // { provide: COMPLAINT_TRIAGE_ADAPTER, useClass: OpenAiComplaintTriageAdapter }
    { provide: COMPLAINT_TRIAGE_ADAPTER, useClass: MockComplaintTriageAdapter },
  ],
})
export class AiWorkerModule {}
