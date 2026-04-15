// apps/ai-worker/src/processors/crack-analysis.processor.ts
// 균열 심층 분석 프로세서 — CRACK_ANALYSIS Bull Job 처리
import { Process, Processor } from '@nestjs/bull'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bull'
import * as http from 'http'
import * as https from 'https'
import { JobStatusClient } from '../job-status.client'
import {
  CrackAnalysisAdapter,
  CrackAnalysisInput,
  CRACK_ANALYSIS_ADAPTER,
} from '../adapters/crack-analysis.adapter'
import { CrackAnalysisStatus } from '@ax/shared'

interface CrackAnalysisJobData {
  /** CrackAnalysisResult._id */
  analysisId: string
  orgId: string
  complexId: string
  gaugePointId: string
  measurementId?: string
  /** 원본 이미지 S3 키 */
  capturedImageKey: string
  roi?: { x: number; y: number; w: number; h: number }
  mmPerGraduation: number
  manualPxPerMm?: number
  model?: 'OPENCV_WASM' | 'MOCK'
  extractMask?: boolean
  extractSkeleton?: boolean
  widthSampleCount?: number
}

@Processor('ai-queue')
export class CrackAnalysisProcessor {
  private readonly logger = new Logger(CrackAnalysisProcessor.name)
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000'
  private readonly secret = process.env.WORKER_SECRET ?? 'dev-worker-secret'

  constructor(
    private readonly statusClient: JobStatusClient,
    @Inject(CRACK_ANALYSIS_ADAPTER)
    private readonly analysisAdapter: CrackAnalysisAdapter,
  ) {}

  @Process('CRACK_ANALYSIS')
  async handleCrackAnalysis(job: Job<CrackAnalysisJobData>): Promise<void> {
    const {
      analysisId, orgId, complexId, gaugePointId, measurementId,
      capturedImageKey, roi, mmPerGraduation, manualPxPerMm,
      model = 'MOCK', extractMask, extractSkeleton, widthSampleCount,
    } = job.data

    this.logger.log(`Processing CRACK_ANALYSIS: analysisId=${analysisId}`)

    // analysisId가 jobDocId 역할 (CrackAnalysisResult._id로 상태 추적)
    await this.statusClient.updateStatus(analysisId, orgId, { status: 'RUNNING', progress: 0 })

    const startMs = Date.now()

    try {
      // ── 1단계: 분석 준비 ─────────────────────────────────────────────────────
      await this.reportProgress(job, analysisId, orgId, 10, '이미지 사전처리')

      // ── 2단계: CV 분석 실행 ──────────────────────────────────────────────────
      await this.reportProgress(job, analysisId, orgId, 20, `CV 분석 시작 (${model})`)

      const input: CrackAnalysisInput = {
        storageKey: capturedImageKey,
        options: {
          roi,
          calibration: { mmPerGraduation, manualPxPerMm },
          extractMask,
          extractSkeleton,
          model,
          widthSampleCount,
        },
      }

      const adapterResult = await this.analysisAdapter.analyze(input)
      const processingTimeMs = Date.now() - startMs

      await this.reportProgress(job, analysisId, orgId, 80, `분석 완료 — 폭 ${adapterResult.analysis.maxWidthMm}mm`)

      // ── 3단계: 결과 저장 (API 내부 엔드포인트 호출) ──────────────────────────
      await this.saveResult({
        analysisId,
        orgId,
        analysisStatus: CrackAnalysisStatus.COMPLETED,
        confidence: adapterResult.confidence,
        confidenceBreakdown: adapterResult.confidenceBreakdown,
        calibration: adapterResult.calibration,
        analysis: adapterResult.analysis,
        finalWidthMm: adapterResult.analysis.maxWidthMm,
        finalLengthMm: adapterResult.analysis.lengthMm,
        modelVersion: adapterResult.modelVersion,
        processingTimeMs,
      })

      await this.reportProgress(job, analysisId, orgId, 100, '결과 저장 완료')

      this.logger.log(
        `CRACK_ANALYSIS completed: analysisId=${analysisId} widthMm=${adapterResult.analysis.maxWidthMm} confidence=${adapterResult.confidence}`,
      )
    } catch (err: any) {
      const processingTimeMs = Date.now() - startMs
      this.logger.error(`CRACK_ANALYSIS failed: analysisId=${analysisId} error=${err.message}`)

      await this.saveResult({
        analysisId,
        orgId,
        analysisStatus: CrackAnalysisStatus.FAILED,
        confidence: 0,
        finalWidthMm: 0,
        modelVersion: 'error',
        processingTimeMs,
        failureReason: err.message,
      })

      await this.statusClient.updateStatus(analysisId, orgId, {
        status: 'FAILED',
        error: err.message,
      })

      throw err
    }
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

  private async reportProgress(
    job: Job,
    analysisId: string,
    orgId: string,
    progress: number,
    label: string,
  ): Promise<void> {
    await job.progress(progress)
    await this.statusClient.updateStatus(analysisId, orgId, { status: 'RUNNING', progress })
    this.logger.debug(`${analysisId} — ${label} (${progress}%)`)
  }

  /**
   * 분석 결과를 API 내부 엔드포인트로 전송
   * POST /api/v1/crack-analysis/internal/result
   */
  private async saveResult(payload: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      const body = JSON.stringify(payload)
      const url = new URL('/api/v1/crack-analysis/internal/result', this.apiUrl)
      const lib = url.protocol === 'https:' ? https : http
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Worker-Secret': this.secret,
          },
        },
        (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 400) {
            this.logger.error(
              `saveResult failed: HTTP ${res.statusCode} for analysisId=${payload.analysisId}`,
            )
          }
          resolve()
        },
      )
      req.on('error', (err) => {
        this.logger.error(`saveResult HTTP error: ${err.message}`)
        resolve()
      })
      req.write(body)
      req.end()
    })
  }
}
