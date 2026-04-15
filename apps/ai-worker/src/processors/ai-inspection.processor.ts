// apps/ai-worker/src/processors/ai-inspection.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface AiImageAnalysisPayload {
  jobDocId: string;
  orgId: string;
  imageKey: string;
  analysisType: string;
}

@Processor('ai-queue')
export class AiInspectionProcessor {
  private readonly logger = new Logger(AiInspectionProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('AI_IMAGE_ANALYSIS')
  async handleAiImageAnalysis(job: Job<AiImageAnalysisPayload>): Promise<void> {
    const { jobDocId, orgId, imageKey, analysisType } = job.data;
    this.logger.log(`Processing AI_IMAGE_ANALYSIS: ${jobDocId}`);

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // Phase 2 stub: simulate processing stages
      await this.simulateProgress(job, jobDocId, orgId, [
        { progress: 20, label: '이미지 전처리' },
        { progress: 50, label: 'AI 모델 추론 (Mask R-CNN)' },
        { progress: 80, label: 'KCS 기준 대조' },
        { progress: 100, label: '결과 저장' },
      ]);

      // Stub result — Phase 2 will replace with real inference
      const result = {
        detections: [
          {
            defectType: 'CRACK',
            confidence: 0.92,
            confidenceLevel: 'AUTO_ACCEPT',
            isAutoAccepted: true,
            suggestedSeverity: 'MEDIUM',
            aiCaption: `${analysisType} 균열 탐지 완료 (신뢰도 92%)`,
            kcsStandardRef: 'KCS 41 55 02',
            kcsExceedsLimit: false,
            boundingBox: [0.1, 0.2, 0.3, 0.15],
          },
        ],
        processedImageKey: imageKey,
        modelVersion: 'mask-rcnn-v1.0-stub',
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(`AI_IMAGE_ANALYSIS completed: ${jobDocId}`);
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      throw err;
    }
  }

  private async simulateProgress(
    job: Job,
    jobDocId: string,
    orgId: string,
    stages: { progress: number; label: string }[],
  ): Promise<void> {
    for (const stage of stages) {
      await new Promise((r) => setTimeout(r, 500));
      await job.progress(stage.progress);
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'RUNNING',
        progress: stage.progress,
      });
      this.logger.debug(`${jobDocId} — ${stage.label} (${stage.progress}%)`);
    }
  }
}
