// apps/job-worker/src/processors/risk-score-calculation.processor.ts
// Phase 2-9: 위험도 스코어 비동기 계산 프로세서

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as http from 'http';
import * as https from 'https';
import { JobStatusClient } from '../job-status.client';
import { RiskScoreCalculatePayload, JobType } from '@ax/shared';

@Processor('job-queue')
export class RiskScoreCalculationProcessor {
  private readonly logger = new Logger(RiskScoreCalculationProcessor.name);
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000';
  private readonly secret = process.env.WORKER_SECRET ?? 'dev-worker-secret';

  constructor(private readonly statusClient: JobStatusClient) {}

  @Process(JobType.RISK_SCORE_CALCULATE)
  async handleRiskScoreCalculate(job: Job<RiskScoreCalculatePayload>): Promise<void> {
    const { riskScoreId, complexId, targetType, targetId, targetName, generateRecommendation } = job.data;
    this.logger.log(`RISK_SCORE_CALCULATE 시작: riskScoreId=${riskScoreId} target=${targetId}`);

    const startMs = Date.now();

    try {
      await job.progress(10);

      // 1단계: orgId 추출 (riskScoreId 형식: riskScore:orgId:rsk_...)
      const parts = riskScoreId.split(':');
      const orgId = parts[1];
      if (!orgId) throw new Error(`riskScoreId 형식 오류: ${riskScoreId}`);

      await job.progress(20);

      // 2단계: API 내부 엔드포인트로 동기 계산 요청
      // POST /api/v1/risk-scoring/internal/compute
      const computeResult = await this.postJson(
        '/api/v1/risk-scoring/internal/compute',
        orgId,
        { complexId, targetType, targetId, targetName },
      );

      await job.progress(70);

      if (!computeResult || computeResult.error) {
        throw new Error(`계산 실패: ${computeResult?.error ?? '알 수 없는 오류'}`);
      }

      // 3단계: 결과 저장 — riskScoreId 문서 업데이트
      await this.postJson(
        '/api/v1/risk-scoring/internal/save',
        orgId,
        {
          riskScoreId,
          score: computeResult.score,
          level: computeResult.level,
          confidence: computeResult.confidence,
          subScores: computeResult.subScores,
          evidence: computeResult.evidence,
        },
      );

      await job.progress(85);

      // 4단계: 권장 문서 자동 생성 (옵션)
      if (generateRecommendation !== false) {
        await this.postJson(
          '/api/v1/maintenance-recommendations/internal/from-risk-score',
          orgId,
          { riskScoreId },
        ).catch(err => this.logger.warn(`권장 생성 실패 (비필수): ${err.message}`));
      }

      await job.progress(100);

      this.logger.log(
        `RISK_SCORE_CALCULATE 완료: riskScoreId=${riskScoreId} ` +
        `score=${computeResult.score} level=${computeResult.level} ` +
        `(${Date.now() - startMs}ms)`,
      );

    } catch (err: any) {
      this.logger.error(`RISK_SCORE_CALCULATE 실패: ${err.message}`, err.stack);
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
