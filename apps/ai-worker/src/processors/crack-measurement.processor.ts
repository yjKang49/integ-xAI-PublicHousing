// apps/ai-worker/src/processors/crack-measurement.processor.ts
// 균열 폭 측정 프로세서 — 특허 10-2398241 기반 OpenCV.js WASM 파이프라인 (Phase 2 stub)
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface CrackMeasurementPayload {
  jobDocId: string;
  orgId: string;
  imageKey: string;
  gaugePointId: string;
  calibrationScaleMmPerPx?: number;
}

@Processor('ai-queue')
export class CrackMeasurementProcessor {
  private readonly logger = new Logger(CrackMeasurementProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('CRACK_WIDTH_MEASUREMENT')
  async handleCrackWidthMeasurement(
    job: Job<CrackMeasurementPayload>,
  ): Promise<void> {
    const { jobDocId, orgId, imageKey, gaugePointId, calibrationScaleMmPerPx = 0.05 } =
      job.data;
    this.logger.log(`Processing CRACK_WIDTH_MEASUREMENT: ${jobDocId}`);

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      await this.simulateProgress(job, jobDocId, orgId, [
        { progress: 20, label: '이미지 로드' },
        { progress: 45, label: 'ROI 추출 (OpenCV.js 특허 10-2398241)' },
        { progress: 70, label: '교정 스케일 계산' },
        { progress: 100, label: '균열 폭 측정' },
      ]);

      // Stub result: random width 0.1mm ~ 2.0mm, confidence 0.85 ~ 0.99
      const estimatedWidthMm =
        Math.round((Math.random() * 1.9 + 0.1) * 100) / 100;
      const confidence =
        Math.round((Math.random() * 0.14 + 0.85) * 1000) / 1000;

      const result = {
        gaugePointId,
        imageKey,
        estimatedWidthMm,
        confidence,
        calibrationScaleMmPerPx,
        method: 'OPENCV_WASM',
        patentRef: '10-2398241',
        // Phase 2: crack gauge point measurementCount will be incremented
        // via a dedicated PATCH /api/v1/crack-gauge-points/:id endpoint
        measurementCountStub: '1 (to be aggregated in Phase 3)',
        measuredAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(
        `CRACK_WIDTH_MEASUREMENT completed: ${jobDocId} width=${estimatedWidthMm}mm`,
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
