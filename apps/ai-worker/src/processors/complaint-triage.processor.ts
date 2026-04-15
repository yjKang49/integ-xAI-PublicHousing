// apps/ai-worker/src/processors/complaint-triage.processor.ts
// 민원 AI 분류 프로세서 — COMPLAINT_TRIAGE Bull Job 처리
import { Process, Processor } from '@nestjs/bull'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bull'
import * as http from 'http'
import * as https from 'https'
import { JobStatusClient } from '../job-status.client'
import {
  ComplaintTriageAdapter,
  ComplaintTriageInput,
  COMPLAINT_TRIAGE_ADAPTER,
} from '../adapters/complaint-triage.adapter'
import {
  buildTriageSystemPrompt,
  buildTriageUserPrompt,
  parseTriageResponse,
  TRIAGE_PROMPT_VERSION,
  ComplaintTriageContext,
} from '../prompts/complaint-triage.prompt'
import { ComplaintTriageStatus } from '@ax/shared'

// ── 키워드 기반 Rule-based Fallback ─────────────────────────────────────────

interface FallbackRule {
  keywords: string[]
  category: string
  severity: string
  urgencyScore: number
  priority: string
  sla: string
  teamId: string
  teamName: string
}

const FALLBACK_RULES: FallbackRule[] = [
  { keywords: ['누수','물','방수','습기'], category: 'FACILITY', severity: 'HIGH',   urgencyScore: 70, priority: 'HIGH',   sla: '48h', teamId: 'waterproof-team', teamName: '방수·누수 처리팀' },
  { keywords: ['균열','크랙'],           category: 'FACILITY', severity: 'HIGH',   urgencyScore: 72, priority: 'HIGH',   sla: '48h', teamId: 'structural-team', teamName: '구조물 점검팀' },
  { keywords: ['안전','위험','사고'],    category: 'SAFETY',   severity: 'CRITICAL',urgencyScore: 90, priority: 'URGENT', sla: '24h', teamId: 'safety-team',     teamName: '안전관리팀' },
  { keywords: ['엘리베이터','승강기'],   category: 'ELEVATOR', severity: 'HIGH',   urgencyScore: 80, priority: 'HIGH',   sla: '24h', teamId: 'elevator-team',   teamName: '엘리베이터 유지보수팀' },
  { keywords: ['소음','층간'],           category: 'NOISE',    severity: 'MEDIUM', urgencyScore: 45, priority: 'MEDIUM', sla: '72h', teamId: 'noise-team',      teamName: '층간소음 민원팀' },
  { keywords: ['주차','불법주차'],       category: 'PARKING',  severity: 'LOW',    urgencyScore: 28, priority: 'LOW',    sla: '7d',  teamId: 'parking-team',    teamName: '주차관리팀' },
  { keywords: ['위생','청소','해충'],    category: 'SANITATION',severity: 'MEDIUM',urgencyScore: 52, priority: 'MEDIUM', sla: '48h', teamId: 'sanitation-team', teamName: '위생관리팀' },
]

function applyFallback(text: string): {
  category: string; severity: string; urgencyScore: number
  priority: string; sla: string; teamId: string; teamName: string
  keywords: string[]
} {
  const lower = text.toLowerCase()
  for (const rule of FALLBACK_RULES) {
    const hits = rule.keywords.filter(k => lower.includes(k))
    if (hits.length > 0) {
      return { ...rule, keywords: hits }
    }
  }
  return {
    category: 'OTHER', severity: 'LOW', urgencyScore: 25,
    priority: 'LOW', sla: '7d',
    teamId: 'general-team', teamName: '일반민원팀',
    keywords: [],
  }
}

// ── Job 데이터 타입 ───────────────────────────────────────────────────────────

interface ComplaintTriageJobData {
  jobDocId: string
  triageId: string
  complaintId: string
  orgId: string
  complexId: string
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
}

// ── 프로세서 ─────────────────────────────────────────────────────────────────

@Processor('ai-queue')
export class ComplaintTriageProcessor {
  private readonly logger = new Logger(ComplaintTriageProcessor.name)
  private readonly apiUrl  = process.env.API_URL  ?? 'http://api:3000'
  private readonly secret  = process.env.WORKER_SECRET ?? 'dev-worker-secret'

  constructor(
    private readonly statusClient: JobStatusClient,
    @Inject(COMPLAINT_TRIAGE_ADAPTER)
    private readonly triageAdapter: ComplaintTriageAdapter,
  ) {}

  @Process('COMPLAINT_TRIAGE')
  async handleComplaintTriage(job: Job<ComplaintTriageJobData>): Promise<void> {
    const {
      jobDocId, triageId, complaintId, orgId, complexId,
      model = 'MOCK',
    } = job.data

    this.logger.log(`Processing COMPLAINT_TRIAGE: triageId=${triageId} complaintId=${complaintId}`)
    await this.statusClient.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 })

    const startMs = Date.now()
    let isRuleBased = false

    try {
      // ── 1단계: 민원 데이터 수집 ─────────────────────────────────────────────
      await this.reportProgress(job, jobDocId, orgId, 10, '민원 데이터 수집')

      const complaint = await this.fetchJson(
        `/api/v1/complaints/${encodeURIComponent(complaintId)}`,
        orgId,
      )
      if (!complaint) throw new Error(`Complaint ${complaintId} not found`)

      const complex = await this.fetchJson(`/api/v1/complexes/${complexId}`, orgId)
      const complexName = complex?.name ?? complexId

      await this.reportProgress(job, jobDocId, orgId, 20, '프롬프트 렌더링')

      // ── 2단계: 프롬프트 생성 ──────────────────────────────────────────────────
      const ctx: ComplaintTriageContext = {
        title:              complaint.title ?? '',
        description:        complaint.description ?? '',
        classificationHint: complaint.classificationHint,
        hasImage:           (complaint.mediaIds ?? []).length > 0,
        buildingId:         complaint.buildingId,
        unitNumber:         complaint.unitNumber,
        submittedBy:        complaint.submittedBy ?? '',
        submittedPhone:     complaint.submittedPhone,
        complexName,
        complexId,
      }

      const systemPrompt = buildTriageSystemPrompt()
      const userPrompt   = buildTriageUserPrompt(ctx)

      await this.reportProgress(job, jobDocId, orgId, 35, `AI 분류 시작 (${model})`)

      // ── 3단계: AI 분류 (실패 시 rule-based fallback) ─────────────────────────
      let triageResult: any
      let modelVersion: string

      try {
        const input: ComplaintTriageInput = { systemPrompt, userPrompt, model, context: ctx }
        const output = await this.triageAdapter.classify(input)
        triageResult = output.result
        modelVersion = output.modelVersion
        this.logger.debug(
          `AI 분류 완료: category=${triageResult.category} score=${triageResult.urgencyScore} confidence=${triageResult.confidence}`,
        )
      } catch (aiErr: any) {
        this.logger.warn(`AI 분류 실패, rule-based fallback 적용: ${aiErr.message}`)
        isRuleBased = true
        const text = `${ctx.title} ${ctx.description} ${ctx.classificationHint ?? ''}`
        const fb   = applyFallback(text)
        triageResult = {
          category:         fb.category,
          severity:         fb.severity,
          urgencyScore:     fb.urgencyScore,
          suggestedPriority: fb.priority,
          suggestedSla:     fb.sla,
          routingSuggestions: [{
            type: 'TEAM', targetId: fb.teamId, targetName: fb.teamName,
            reason: `rule-based 키워드 분류 (AI 미응답): ${fb.keywords.join(', ') || '기본'}`,
            confidence: 0.60,
          }],
          classificationReason: `AI 분류 실패로 rule-based fallback 적용. 키워드: [${fb.keywords.join(', ')}]`,
          keywordMatches: fb.keywords,
          confidence: 0.60,
        }
        modelVersion = 'rule-based-fallback-1.0.0'
      }

      await this.reportProgress(job, jobDocId, orgId, 75, `분류 완료 — ${triageResult.category} / 점수 ${triageResult.urgencyScore}`)

      // ── 4단계: 결과 저장 (API 내부 엔드포인트) ───────────────────────────────
      await this.saveResult({
        triageId,
        orgId,
        status:               ComplaintTriageStatus.COMPLETED,
        aiCategory:           triageResult.category,
        aiSeverity:           triageResult.severity,
        urgencyScore:         triageResult.urgencyScore,
        suggestedPriority:    triageResult.suggestedPriority,
        suggestedSla:         triageResult.suggestedSla,
        routingSuggestions:   triageResult.routingSuggestions,
        classificationReason: triageResult.classificationReason,
        keywordMatches:       triageResult.keywordMatches,
        confidence:           triageResult.confidence,
        isRuleBased,
        model,
        modelVersion,
        promptVersion: TRIAGE_PROMPT_VERSION,
        processingTimeMs: Date.now() - startMs,
      })

      await this.reportProgress(job, jobDocId, orgId, 95, '결과 저장 완료')

      // ── 5단계: Job 완료 ──────────────────────────────────────────────────────
      await this.statusClient.updateStatus(jobDocId, orgId, {
        status:   'COMPLETED',
        progress: 100,
        result: {
          triageId,
          category:      triageResult.category,
          severity:      triageResult.severity,
          urgencyScore:  triageResult.urgencyScore,
          priority:      triageResult.suggestedPriority,
          confidence:    triageResult.confidence,
          isRuleBased,
          processingTimeMs: Date.now() - startMs,
        },
      })

      this.logger.log(
        `COMPLAINT_TRIAGE completed: triageId=${triageId} category=${triageResult.category} ` +
        `score=${triageResult.urgencyScore} ruleBased=${isRuleBased}`,
      )

    } catch (err: any) {
      const processingTimeMs = Date.now() - startMs
      this.logger.error(`COMPLAINT_TRIAGE failed: triageId=${triageId} error=${err.message}`)

      await this.saveResult({
        triageId,
        orgId,
        status:           ComplaintTriageStatus.FAILED,
        urgencyScore:     0,
        routingSuggestions: [],
        confidence:       0,
        isRuleBased:      false,
        model,
        modelVersion:     'error',
        promptVersion:    TRIAGE_PROMPT_VERSION,
        processingTimeMs,
        failureReason:    err.message,
      })

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
            try { resolve(JSON.parse(data)) } catch { resolve(null) }
          })
        },
      )
      req.on('error', reject)
      req.end()
    })
  }

  /**
   * 분류 결과를 API 내부 엔드포인트로 전송
   * POST /api/v1/complaint-triage/internal/result
   */
  private async saveResult(payload: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      const body = JSON.stringify(payload)
      const url  = new URL('/api/v1/complaint-triage/internal/result', this.apiUrl)
      const lib  = url.protocol === 'https:' ? https : http
      const req  = lib.request(
        {
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'POST',
          headers: {
            'Content-Type':    'application/json',
            'Content-Length':  Buffer.byteLength(body),
            'X-Worker-Secret': this.secret,
          },
        },
        (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 400) {
            this.logger.error(
              `saveResult failed: HTTP ${res.statusCode} for triageId=${payload.triageId}`,
            )
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
}
