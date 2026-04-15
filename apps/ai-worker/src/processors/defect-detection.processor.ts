// apps/ai-worker/src/processors/defect-detection.processor.ts
// 결함 자동 탐지 프로세서 — DEFECT_DETECTION Bull Job 처리
import { Process, Processor } from '@nestjs/bull'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bull'
import * as http from 'http'
import * as https from 'https'
import { JobStatusClient } from '../job-status.client'
import {
  VisionInferenceAdapter,
  VisionInferenceInput,
  VISION_INFERENCE_ADAPTER,
} from '../adapters/vision-inference.adapter'

interface DefectDetectionJobData {
  jobDocId: string
  orgId: string
  complexId: string
  buildingId?: string
  sourceType: 'DRONE_FRAME' | 'DRONE_IMAGE' | 'MOBILE_PHOTO' | 'MANUAL'
  sourceMediaId: string
  sourceMissionId?: string
  sourceFrameId?: string
  storageKey: string
  model?: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK'
  confidenceThreshold?: number
  maxDetections?: number
}

@Processor('ai-queue')
export class DefectDetectionProcessor {
  private readonly logger = new Logger(DefectDetectionProcessor.name)
  private readonly apiUrl  = process.env.API_URL  ?? 'http://api:3000'
  private readonly secret  = process.env.WORKER_SECRET ?? 'dev-worker-secret'

  constructor(
    private readonly statusClient: JobStatusClient,
    @Inject(VISION_INFERENCE_ADAPTER)
    private readonly inferenceAdapter: VisionInferenceAdapter,
  ) {}

  @Process('DEFECT_DETECTION')
  async handleDefectDetection(job: Job<DefectDetectionJobData>): Promise<void> {
    const {
      jobDocId, orgId, complexId, buildingId,
      sourceType, sourceMediaId, sourceMissionId, sourceFrameId,
      storageKey, model = 'MOCK',
      confidenceThreshold = 0.5,
      maxDetections = 20,
    } = job.data

    this.logger.log(`Processing DEFECT_DETECTION: jobDocId=${jobDocId} storageKey=${storageKey}`)

    await this.statusClient.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 })

    try {
      // ── 1단계: 이미지 다운로드 준비 ─────────────────────────────────────────
      await this.reportProgress(job, jobDocId, orgId, 10, '이미지 사전처리')

      // ── 2단계: AI 추론 ───────────────────────────────────────────────────────
      await this.reportProgress(job, jobDocId, orgId, 30, `AI 추론 시작 (${model})`)

      const inferenceInput: VisionInferenceInput = {
        storageKey,
        confidenceThreshold,
        maxDetections,
        model,
      }
      const result = await this.inferenceAdapter.detect(inferenceInput)

      await this.reportProgress(job, jobDocId, orgId, 70, `탐지 완료 — 후보 ${result.candidates.length}건`)

      // ── 3단계: 후보 저장 (API 내부 배치 엔드포인트 호출) ────────────────────
      if (result.candidates.length > 0) {
        await this.saveCandidates({
          jobDocId,
          orgId,
          complexId,
          buildingId,
          sourceType,
          sourceMediaId,
          sourceMissionId,
          sourceFrameId,
          storageKey,
          detections: result.candidates.map((c) => ({
            defectType:        c.defectType,
            confidence:        c.confidence,
            bbox:              c.bbox,
            suggestedSeverity: c.suggestedSeverity,
            aiCaption:         c.aiCaption,
            kcsStandardRef:    c.kcsStandardRef,
            kcsExceedsLimit:   c.kcsExceedsLimit,
          })),
          modelVersion:    result.modelVersion,
          detectionMethod: model,
        })
      }

      await this.reportProgress(job, jobDocId, orgId, 90, '결과 저장 완료')

      // ── 4단계: Job 완료 ──────────────────────────────────────────────────────
      await this.statusClient.updateStatus(jobDocId, orgId, {
        status:   'COMPLETED',
        progress: 100,
        result: {
          storageKey,
          detectedCount:  result.candidates.length,
          modelVersion:   result.modelVersion,
          inferenceTimeMs: result.inferenceTimeMs,
          processedAt:    result.processedAt,
          summary: result.candidates.map((c) => ({
            defectType:       c.defectType,
            confidence:       c.confidence,
            confidenceLevel:  c.confidenceLevel,
            suggestedSeverity: c.suggestedSeverity,
          })),
        },
      })

      this.logger.log(
        `DEFECT_DETECTION completed: jobDocId=${jobDocId} detected=${result.candidates.length} model=${result.modelVersion}`,
      )
    } catch (err: any) {
      this.logger.error(`DEFECT_DETECTION failed: jobDocId=${jobDocId} error=${err.message}`)
      await this.statusClient.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error:  err.message,
      })
      throw err
    }
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

  private async reportProgress(
    job: Job,
    jobDocId: string,
    orgId: string,
    progress: number,
    label: string,
  ): Promise<void> {
    await job.progress(progress)
    await this.statusClient.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress })
    this.logger.debug(`${jobDocId} — ${label} (${progress}%)`)
  }

  /**
   * 탐지 결과를 API 내부 배치 엔드포인트로 전송
   * POST /api/v1/defect-candidates/internal/batch
   */
  private async saveCandidates(payload: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      const body = JSON.stringify(payload)
      const url  = new URL(
        '/api/v1/defect-candidates/internal/batch',
        this.apiUrl,
      )
      const lib = url.protocol === 'https:' ? https : http
      const req = lib.request(
        {
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Worker-Secret': this.secret,
          },
        },
        (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 400) {
            this.logger.error(
              `saveCandidates failed: HTTP ${res.statusCode} for jobDocId=${payload.jobDocId}`,
            )
          }
          resolve()
        },
      )
      req.on('error', (err) => {
        this.logger.error(`saveCandidates error: ${err.message}`)
        resolve()
      })
      req.write(body)
      req.end()
    })
  }
}
