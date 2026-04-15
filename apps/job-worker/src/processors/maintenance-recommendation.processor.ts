// apps/job-worker/src/processors/maintenance-recommendation.processor.ts
// Phase 2-9: 장기수선 권장 문서 생성 프로세서

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as http from 'http';
import * as https from 'https';
import { JobStatusClient } from '../job-status.client';
import { MaintenanceRecommendPayload, JobType } from '@ax/shared';

@Processor('job-queue')
export class MaintenanceRecommendationProcessor {
  private readonly logger = new Logger(MaintenanceRecommendationProcessor.name);
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000';
  private readonly secret = process.env.WORKER_SECRET ?? 'dev-worker-secret';

  constructor(private readonly statusClient: JobStatusClient) {}

  @Process(JobType.MAINTENANCE_RECOMMEND)
  async handleMaintenanceRecommend(job: Job<MaintenanceRecommendPayload>): Promise<void> {
    const { recommendationId, riskScoreId, complexId, targetType, targetId } = job.data;
    this.logger.log(
      `MAINTENANCE_RECOMMEND 시작: recommendationId=${recommendationId} riskScoreId=${riskScoreId}`,
    );

    const startMs = Date.now();

    try {
      await job.progress(10);

      // orgId 추출 (recommendationId 형식: maintenanceRecommendation:orgId:rec_...)
      const parts = recommendationId.split(':');
      const orgId = parts[1];
      if (!orgId) throw new Error(`recommendationId 형식 오류: ${recommendationId}`);

      await job.progress(30);

      // 권장 문서 생성 (API 내부)
      const result = await this.postJson(
        '/api/v1/maintenance-recommendations/internal/from-risk-score',
        orgId,
        { riskScoreId },
      );

      await job.progress(90);

      if (!result) throw new Error('권장 문서 생성 실패');

      await job.progress(100);

      this.logger.log(
        `MAINTENANCE_RECOMMEND 완료: recommendationId=${result._id ?? recommendationId} ` +
        `(${Date.now() - startMs}ms)`,
      );

    } catch (err: any) {
      this.logger.error(`MAINTENANCE_RECOMMEND 실패: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ── 내부 HTTP 헬퍼 ─────────────────────────────────────────────────────────

  private postJson(path: string, orgId: string, body: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const url = new URL(path, this.apiUrl);
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'X-Worker-Secret': this.secret,
            'X-Org-Id': orgId,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => { raw += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
              return;
            }
            try { resolve(JSON.parse(raw)); } catch { resolve(null); }
          });
        },
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}
