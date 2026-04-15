// apps/job-worker/src/processors/report.processor.ts
// 보고서 생성 프로세서 — 데이터 수집 → 템플릿 렌더링 → PDF 생성 → S3 업로드 (Phase 2 stub)
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface ReportGenerationPayload {
  jobDocId: string;
  orgId: string;
  complexId: string;
  reportType: string;
  dateFrom?: string;
  dateTo?: string;
  requestedBy?: string;
}

@Processor('job-queue')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('REPORT_GENERATION')
  async handleReportGeneration(
    job: Job<ReportGenerationPayload>,
  ): Promise<void> {
    const { jobDocId, orgId, complexId, reportType } = job.data;
    this.logger.log(`Processing REPORT_GENERATION: ${jobDocId}`);

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      await this.simulateProgress(job, jobDocId, orgId, [
        { progress: 20, label: '데이터 수집' },
        { progress: 50, label: '템플릿 렌더링' },
        { progress: 75, label: 'PDF 생성' },
        { progress: 100, label: 'S3 업로드' },
      ]);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const result = {
        reportKey: `reports/${orgId}/${complexId}/${timestamp}.pdf`,
        reportType,
        pageCount: 12,
        sizeKb: 248,
        generatedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });
      this.logger.log(
        `REPORT_GENERATION completed: ${jobDocId} key=${result.reportKey}`,
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
