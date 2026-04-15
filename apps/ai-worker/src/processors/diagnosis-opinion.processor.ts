// apps/ai-worker/src/processors/diagnosis-opinion.processor.ts
// AI 진단 의견 프로세서 — DIAGNOSIS_OPINION Bull Job 처리
import { Process, Processor } from '@nestjs/bull'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bull'
import * as http from 'http'
import * as https from 'https'
import { JobStatusClient } from '../job-status.client'
import {
  LlmDiagnosisAdapter,
  LlmDiagnosisInput,
  LLM_DIAGNOSIS_ADAPTER,
} from '../adapters/llm-diagnosis.adapter'
import {
  buildSystemPrompt,
  buildUserPrompt,
  DiagnosisPromptContext,
  PROMPT_VERSION,
} from '../prompts/diagnosis-opinion.prompt'
import { DiagnosisOpinionStatus } from '@ax/shared'

interface DiagnosisOpinionJobData {
  jobDocId: string
  /** 미리 생성된 DiagnosisOpinion._id */
  diagnosisId: string
  orgId: string
  complexId: string
  targetType: 'DEFECT' | 'INSPECTION_SESSION' | 'GAUGE_POINT' | 'COMPLEX'
  targetId: string
  sessionId?: string
  defectIds?: string[]
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
  language?: 'ko' | 'en'
}

@Processor('ai-queue')
export class DiagnosisOpinionProcessor {
  private readonly logger = new Logger(DiagnosisOpinionProcessor.name)
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000'
  private readonly secret = process.env.WORKER_SECRET ?? 'dev-worker-secret'

  constructor(
    private readonly statusClient: JobStatusClient,
    @Inject(LLM_DIAGNOSIS_ADAPTER)
    private readonly llmAdapter: LlmDiagnosisAdapter,
  ) {}

  @Process('DIAGNOSIS_OPINION')
  async handleDiagnosisOpinion(job: Job<DiagnosisOpinionJobData>): Promise<void> {
    const {
      jobDocId, diagnosisId, orgId, complexId,
      targetType, targetId, sessionId, defectIds,
      model = 'MOCK', language = 'ko',
    } = job.data

    this.logger.log(`Processing DIAGNOSIS_OPINION: diagnosisId=${diagnosisId} targetType=${targetType}`)

    await this.statusClient.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 })

    const startMs = Date.now()

    try {
      // ── 1단계: 컨텍스트 수집 ─────────────────────────────────────────────────
      await this.reportProgress(job, jobDocId, orgId, 10, '컨텍스트 데이터 수집')

      const context = await this.fetchContext({
        orgId, complexId, targetType, targetId, sessionId, defectIds,
      })

      await this.reportProgress(job, jobDocId, orgId, 30, '프롬프트 렌더링')

      // ── 2단계: 프롬프트 생성 ──────────────────────────────────────────────────
      const systemPrompt = buildSystemPrompt(language)
      const userPrompt   = buildUserPrompt({ ...context, language })

      // ── 3단계: LLM 호출 ───────────────────────────────────────────────────────
      await this.reportProgress(job, jobDocId, orgId, 40, `LLM 추론 시작 (${model})`)

      const llmInput: LlmDiagnosisInput = {
        systemPrompt,
        userPrompt,
        model,
        context: { ...context, language },
      }

      const result = await this.llmAdapter.generate(llmInput)
      const processingTimeMs = Date.now() - startMs

      await this.reportProgress(job, jobDocId, orgId, 80, `의견 생성 완료 — 긴급도: ${result.urgency}`)

      // ── 4단계: 결과 저장 (API 내부 엔드포인트 호출) ──────────────────────────
      await this.saveResult({
        diagnosisId,
        orgId,
        status: DiagnosisOpinionStatus.DRAFT,
        summary: result.summary,
        technicalOpinionDraft: result.technicalOpinionDraft,
        urgency: result.urgency,
        estimatedPriorityScore: result.estimatedPriorityScore,
        confidence: result.confidence,
        model,
        modelVersion: result.modelVersion,
        promptVersion: PROMPT_VERSION,
        tokensUsed: result.tokensUsed,
        processingTimeMs,
        contextSummary: {
          defectCount: context.defects.length,
          crackMeasurementCount: context.cracks.length,
          complaintCount: context.complaints.length,
          alertCount: context.alerts.length,
        },
        recommendationDrafts: result.recommendations,
      })

      await this.reportProgress(job, jobDocId, orgId, 100, '결과 저장 완료')

      await this.statusClient.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result: {
          diagnosisId,
          urgency: result.urgency,
          priorityScore: result.estimatedPriorityScore,
          confidence: result.confidence,
          recommendationCount: result.recommendations.length,
          processingTimeMs,
        },
      })

      this.logger.log(
        `DIAGNOSIS_OPINION completed: diagnosisId=${diagnosisId} urgency=${result.urgency} score=${result.estimatedPriorityScore}`,
      )
    } catch (err: any) {
      const processingTimeMs = Date.now() - startMs
      this.logger.error(`DIAGNOSIS_OPINION failed: diagnosisId=${diagnosisId} error=${err.message}`)

      await this.saveResult({
        diagnosisId,
        orgId,
        status: DiagnosisOpinionStatus.REJECTED,
        summary: '',
        technicalOpinionDraft: '',
        urgency: 'ROUTINE',
        estimatedPriorityScore: 0,
        confidence: 0,
        model,
        modelVersion: 'error',
        promptVersion: PROMPT_VERSION,
        processingTimeMs,
        failureReason: err.message,
      })

      await this.statusClient.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      })

      throw err
    }
  }

  // ── 컨텍스트 수집 ──────────────────────────────────────────────────────────────

  /**
   * API에서 결함·균열·민원·경보 컨텍스트를 수집
   * 실패해도 빈 배열로 폴백하여 분석을 계속 진행
   */
  private async fetchContext(params: {
    orgId: string
    complexId: string
    targetType: string
    targetId: string
    sessionId?: string
    defectIds?: string[]
  }): Promise<Omit<DiagnosisPromptContext, 'language'>> {
    const { orgId, complexId, targetType, targetId, sessionId, defectIds } = params

    // 병렬로 여러 컨텍스트 API 호출
    const [defectsData, cracksData, complaintsData, alertsData, complexData] = await Promise.allSettled([
      this.fetchJson(`/api/v1/defect-candidates?complexId=${complexId}&limit=20`, orgId),
      this.fetchJson(`/api/v1/cracks/measurements?complexId=${complexId}&limit=10`, orgId),
      this.fetchJson(`/api/v1/complaints?complexId=${complexId}&limit=10&status=OPEN`, orgId),
      this.fetchJson(`/api/v1/alerts?complexId=${complexId}&limit=10&status=ACTIVE`, orgId),
      this.fetchJson(`/api/v1/complexes/${complexId}`, orgId),
    ])

    const defectsRaw = defectsData.status === 'fulfilled' ? (defectsData.value?.items ?? defectsData.value?.docs ?? []) : []
    const cracksRaw  = cracksData.status === 'fulfilled'  ? (cracksData.value?.items ?? cracksData.value?.docs ?? [])  : []
    const complaintsRaw = complaintsData.status === 'fulfilled' ? (complaintsData.value?.items ?? complaintsData.value?.docs ?? []) : []
    const alertsRaw  = alertsData.status === 'fulfilled'  ? (alertsData.value?.items ?? alertsData.value?.docs ?? [])  : []
    const complexRaw = complexData.status === 'fulfilled' ? complexData.value : null

    return {
      complexName: complexRaw?.name ?? complexId,
      complexId,
      targetType,
      targetId,
      defects: defectsRaw.slice(0, 15).map((d: any) => ({
        defectId: d._id ?? '',
        defectType: d.defectType ?? d.type ?? '',
        severity: d.severity ?? '',
        description: d.description,
        locationDescription: d.locationDescription,
        widthMm: d.widthMm,
        lengthMm: d.lengthMm,
        kcsStandardRef: d.kcsStandardRef,
        kcsExceedsLimit: d.kcsExceedsLimit,
        aiCaption: d.aiCaption,
        isRepaired: d.isRepaired ?? false,
        createdAt: d.createdAt ?? '',
      })),
      cracks: cracksRaw.slice(0, 10).map((c: any) => ({
        gaugePointId: c.gaugePointId ?? '',
        measuredWidthMm: c.measuredWidthMm ?? 0,
        changeFromBaselineMm: c.changeFromBaselineMm,
        exceedsThreshold: c.exceedsThreshold ?? false,
        measuredAt: c.measuredAt ?? '',
      })),
      complaints: complaintsRaw.slice(0, 10).map((c: any) => ({
        complaintId: c._id ?? '',
        category: c.category ?? '',
        title: c.title ?? '',
        priority: c.priority ?? '',
        status: c.status ?? '',
        submittedAt: c.submittedAt ?? '',
      })),
      alerts: alertsRaw.slice(0, 10).map((a: any) => ({
        alertId: a._id ?? '',
        alertType: a.alertType ?? '',
        severity: a.severity ?? '',
        title: a.title ?? '',
        status: a.status ?? '',
        createdAt: a.createdAt ?? '',
      })),
    }
  }

  // ── HTTP 헬퍼 ─────────────────────────────────────────────────────────────────

  private async fetchJson(path: string, orgId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl)
      const lib = url.protocol === 'https:' ? https : http
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          headers: { 'X-Worker-Secret': this.secret, 'X-Org-Id': orgId },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch {
              resolve(null)
            }
          })
        },
      )
      req.on('error', reject)
      req.end()
    })
  }

  /**
   * 진단 결과를 API 내부 엔드포인트로 전송
   * POST /api/v1/diagnosis-opinions/internal/result
   */
  private async saveResult(payload: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      const body = JSON.stringify(payload)
      const url = new URL('/api/v1/diagnosis-opinions/internal/result', this.apiUrl)
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
            this.logger.error(`saveResult HTTP ${res.statusCode} for diagnosisId=${payload.diagnosisId}`)
          }
          resolve()
        },
      )
      req.on('error', (err) => {
        this.logger.error(`saveResult error: ${err.message}`)
        resolve()
      })
      req.write(body)
      req.end()
    })
  }

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
}
