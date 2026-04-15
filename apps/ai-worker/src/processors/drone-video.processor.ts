// apps/ai-worker/src/processors/drone-video.processor.ts
// 드론 영상 분석 프로세서 — Y-MaskNet 프레임별 추론 파이프라인 (Phase 2 stub)
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface DroneVideoAnalysisPayload {
  jobDocId: string;
  orgId: string;
  videoKey: string;
  complexId: string;
  buildingId?: string;
  flightDate?: string;
}

interface DetectionSummaryItem {
  frameIndex: number;
  defectType: string;
  confidence: number;
  severity: string;
  boundingBox: number[];
}

@Processor('ai-queue')
export class DroneVideoProcessor {
  private readonly logger = new Logger(DroneVideoProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('DRONE_VIDEO_ANALYSIS')
  async handleDroneVideoAnalysis(
    job: Job<DroneVideoAnalysisPayload>,
  ): Promise<void> {
    const { jobDocId, orgId, videoKey, complexId, buildingId } = job.data;
    this.logger.log(`Processing DRONE_VIDEO_ANALYSIS: ${jobDocId}`);

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      await this.simulateProgress(job, jobDocId, orgId, [
        { progress: 10, label: '영상 다운로드' },
        { progress: 30, label: '프레임 추출' },
        { progress: 70, label: '프레임별 Y-MaskNet 추론' },
        { progress: 90, label: '결함 클러스터링' },
        { progress: 100, label: '보고서 생성' },
      ]);

      // Stub result — Phase 2 will replace with real Y-MaskNet inference
      const frameCount = 120;
      const detectionsCount = 5;
      const summary: DetectionSummaryItem[] = [
        {
          frameIndex: 12,
          defectType: 'CRACK',
          confidence: 0.94,
          severity: 'MEDIUM',
          boundingBox: [0.15, 0.22, 0.28, 0.18],
        },
        {
          frameIndex: 34,
          defectType: 'SPALLING',
          confidence: 0.88,
          severity: 'HIGH',
          boundingBox: [0.42, 0.31, 0.2, 0.25],
        },
        {
          frameIndex: 57,
          defectType: 'LEAK',
          confidence: 0.91,
          severity: 'MEDIUM',
          boundingBox: [0.6, 0.15, 0.22, 0.3],
        },
        {
          frameIndex: 82,
          defectType: 'CORROSION',
          confidence: 0.87,
          severity: 'LOW',
          boundingBox: [0.08, 0.55, 0.18, 0.12],
        },
        {
          frameIndex: 105,
          defectType: 'CRACK',
          confidence: 0.96,
          severity: 'HIGH',
          boundingBox: [0.35, 0.48, 0.15, 0.22],
        },
      ];

      const result = {
        videoKey,
        complexId,
        buildingId: buildingId ?? null,
        frameCount,
        detectionsCount,
        summary,
        modelVersion: 'y-masknet-v1.0-stub',
        analysedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(
        `DRONE_VIDEO_ANALYSIS completed: ${jobDocId} frames=${frameCount} detections=${detectionsCount}`,
      );
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
      await new Promise((r) => setTimeout(r, 600));
      await job.progress(stage.progress);
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'RUNNING',
        progress: stage.progress,
      });
      this.logger.debug(`${jobDocId} — ${stage.label} (${stage.progress}%)`);
    }
  }
}
