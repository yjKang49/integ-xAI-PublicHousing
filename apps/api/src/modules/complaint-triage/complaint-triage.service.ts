// apps/api/src/modules/complaint-triage/complaint-triage.service.ts
import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import * as crypto from 'crypto'
import { CouchService } from '../../database/couch.service'

const STATS_CACHE_TTL = 30
import { JobsService } from '../jobs/jobs.service'
import { FeatureFlagsService } from '../feature-flags/feature-flags.service'
import {
  ComplaintTriage,
  ComplaintTriageStatus,
  TriageDecisionStatus,
  RoutingSuggestion,
  TriageReviewRecord,
  FeatureFlagKey,
  JobType,
  ComplaintTriagePayload,
} from '@ax/shared'
import {
  TriggerComplaintTriageDto,
  ReviewTriageDto,
  ComplaintTriageQueryDto,
  SaveComplaintTriageResultDto,
} from './dto/complaint-triage.dto'

@Injectable()
export class ComplaintTriageService {
  private readonly logger = new Logger(ComplaintTriageService.name)
  private readonly computingKeys = new Set<string>()

  constructor(
    private readonly couch: CouchService,
    private readonly jobsService: JobsService,
    private readonly flagsService: FeatureFlagsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ── 트리거 ─────────────────────────────────────────────────────────────────

  async trigger(
    orgId: string,
    dto: TriggerComplaintTriageDto,
    userId: string,
  ): Promise<{ triageId: string; jobId: string }> {
    const flagEnabled = await this.flagsService.isEnabled(FeatureFlagKey.AI_COMPLAINT_TRIAGE, orgId)
    if (!flagEnabled) {
      throw new BadRequestException(
        `Feature flag '${FeatureFlagKey.AI_COMPLAINT_TRIAGE}' 가 비활성화되어 있습니다. ` +
        `관리자에게 활성화를 요청하세요.`,
      )
    }

    const uuid8 = crypto.randomBytes(4).toString('hex')
    const triageId = `complaintTriage:${orgId}:${uuid8}`
    const now = new Date().toISOString()

    const doc: ComplaintTriage = {
      _id: triageId,
      docType: 'complaintTriage',
      orgId,
      complexId: dto.complexId,
      complaintId: dto.complaintId,
      urgencyScore: 0,
      routingSuggestions: [],
      hasImage: false,
      model: dto.model ?? 'MOCK',
      modelVersion: 'pending',
      promptVersion: 'pending',
      confidence: 0,
      isRuleBased: false,
      status: ComplaintTriageStatus.PENDING,
      decisionStatus: TriageDecisionStatus.PENDING_REVIEW,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    }

    await this.couch.create(orgId, doc)

    const payload: ComplaintTriagePayload = {
      jobType: JobType.COMPLAINT_TRIAGE,
      triageId,
      complaintId: dto.complaintId,
      complexId: dto.complexId,
      model: dto.model ?? 'MOCK',
    }

    const job = await this.jobsService.create(
      orgId,
      {
        type: JobType.COMPLAINT_TRIAGE,
        payload,
        priority: 'HIGH',
        complexId: dto.complexId,
      },
      userId,
    )

    await this.couch.update(orgId, {
      ...doc,
      triageJobId: job._id,
      status: ComplaintTriageStatus.PROCESSING,
      updatedAt: new Date().toISOString(),
    })

    this.logger.log(`ComplaintTriage triggered: triageId=${triageId} complaintId=${dto.complaintId}`)
    return { triageId, jobId: job._id }
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    query: ComplaintTriageQueryDto,
  ): Promise<{ items: ComplaintTriage[]; total: number }> {
    const page  = Number(query.page  ?? 1)
    const limit = Number(query.limit ?? 20)
    const skip  = (page - 1) * limit

    const selector: any = { docType: 'complaintTriage', orgId }
    if (query.complexId)      selector.complexId      = query.complexId
    if (query.complaintId)    selector.complaintId    = query.complaintId
    if (query.status)         selector.status         = query.status
    if (query.decisionStatus) selector.decisionStatus = query.decisionStatus

    const { docs } = await this.couch.find<ComplaintTriage>(orgId, selector, {
      limit,
      skip,
      sort: [{ createdAt: 'desc' }],
    })

    return { items: docs, total: docs.length + skip }
  }

  async findOne(orgId: string, triageId: string): Promise<ComplaintTriage> {
    const doc = await this.couch.findById<ComplaintTriage>(orgId, triageId)
    if (!doc || doc.docType !== 'complaintTriage') {
      throw new NotFoundException(`ComplaintTriage ${triageId} not found`)
    }
    return doc
  }

  async findByComplaintId(
    orgId: string,
    complaintId: string,
  ): Promise<ComplaintTriage | null> {
    const { docs } = await this.couch.find<ComplaintTriage>(
      orgId,
      { docType: 'complaintTriage', orgId, complaintId },
      { limit: 1, sort: [{ createdAt: 'desc' }] },
    )
    return docs[0] ?? null
  }

  // ── Human-in-the-loop 검토 ───────────────────────────────────────────────

  async review(
    orgId: string,
    triageId: string,
    dto: ReviewTriageDto,
    userId: string,
  ): Promise<ComplaintTriage> {
    const doc = await this.findOne(orgId, triageId)

    if (doc.status !== ComplaintTriageStatus.COMPLETED) {
      throw new BadRequestException('AI 분석이 완료된 트리아지만 검토할 수 있습니다.')
    }
    if (
      doc.decisionStatus === TriageDecisionStatus.ACCEPTED ||
      doc.decisionStatus === TriageDecisionStatus.MODIFIED
    ) {
      throw new BadRequestException('이미 확정된 트리아지입니다.')
    }

    const now = new Date().toISOString()

    // 검토 이력 기록
    const reviewHistory: TriageReviewRecord[] = [...(doc.reviewHistory ?? [])]
    reviewHistory.push({
      previousDecision: doc.decisionStatus,
      newDecision:
        dto.decision === 'ACCEPT'  ? TriageDecisionStatus.ACCEPTED :
        dto.decision === 'MODIFY'  ? TriageDecisionStatus.MODIFIED :
                                     TriageDecisionStatus.REJECTED,
      modifiedCategory:   dto.acceptedCategory,
      modifiedPriority:   dto.acceptedPriority,
      modifiedAssigneeId: dto.acceptedAssigneeId,
      reviewedBy: userId,
      reviewedAt: now,
      note: dto.reviewNote,
    })

    const newDecisionStatus =
      dto.decision === 'ACCEPT'  ? TriageDecisionStatus.ACCEPTED :
      dto.decision === 'MODIFY'  ? TriageDecisionStatus.MODIFIED :
                                   TriageDecisionStatus.REJECTED

    const updated = await this.couch.update(orgId, {
      ...doc,
      decisionStatus:     newDecisionStatus,
      acceptedCategory:   dto.acceptedCategory   ?? (dto.decision === 'ACCEPT' ? doc.aiCategory   : undefined),
      acceptedPriority:   dto.acceptedPriority   ?? (dto.decision === 'ACCEPT' ? doc.suggestedPriority : undefined),
      acceptedAssigneeId: dto.acceptedAssigneeId,
      reviewNote: dto.reviewNote,
      reviewedBy: userId,
      reviewedAt: now,
      reviewHistory,
      updatedAt: now,
    })

    this.logger.log(`ComplaintTriage ${dto.decision}: ${triageId} by ${userId}`)
    return updated as ComplaintTriage
  }

  // ── 워커 내부 결과 저장 ──────────────────────────────────────────────────

  async saveWorkerResult(dto: SaveComplaintTriageResultDto): Promise<void> {
    const doc = await this.couch.findById<ComplaintTriage>(dto.orgId, dto.triageId)
    if (!doc || doc.docType !== 'complaintTriage') {
      this.logger.warn(`saveWorkerResult: triageId ${dto.triageId} not found`)
      return
    }

    const now = new Date().toISOString()
    await this.couch.update(dto.orgId, {
      ...doc,
      status:                dto.status,
      aiCategory:            dto.aiCategory,
      aiSeverity:            dto.aiSeverity,
      urgencyScore:          dto.urgencyScore,
      suggestedPriority:     dto.suggestedPriority,
      suggestedSla:          dto.suggestedSla,
      routingSuggestions:    dto.routingSuggestions as RoutingSuggestion[],
      classificationReason:  dto.classificationReason,
      keywordMatches:        dto.keywordMatches,
      confidence:            dto.confidence,
      isRuleBased:           dto.isRuleBased,
      model:                 dto.model,
      modelVersion:          dto.modelVersion,
      promptVersion:         dto.promptVersion,
      processingTimeMs:      dto.processingTimeMs,
      failureReason:         dto.failureReason,
      // 분석 완료 후 검토 대기 상태로 전이
      decisionStatus: dto.status === ComplaintTriageStatus.COMPLETED
        ? TriageDecisionStatus.PENDING_REVIEW
        : doc.decisionStatus,
      updatedAt: now,
    })

    this.logger.log(
      `ComplaintTriage result saved: triageId=${dto.triageId} ` +
      `score=${dto.urgencyScore} category=${dto.aiCategory} ruleBased=${dto.isRuleBased}`,
    )
  }

  // ── 통계 ────────────────────────────────────────────────────────────────────

  async getStats(orgId: string, complexId?: string): Promise<Record<string, number>> {
    const cacheKey = `complaint-triage:stats:${orgId}:${complexId ?? 'all'}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150))
      const retry = await this.redis.get(cacheKey)
      if (retry) return JSON.parse(retry)
    }
    this.computingKeys.add(cacheKey)
    const fresh = await this.redis.get(cacheKey)
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh) }
    try {
      const selector: any = { docType: 'complaintTriage', orgId }
      if (complexId) selector.complexId = complexId
      const { docs } = await this.couch.find<ComplaintTriage>(orgId, selector, { limit: 0 })
      const result = {
        total:         docs.length,
        pending:       docs.filter(d => d.status === ComplaintTriageStatus.PENDING).length,
        processing:    docs.filter(d => d.status === ComplaintTriageStatus.PROCESSING).length,
        completed:     docs.filter(d => d.status === ComplaintTriageStatus.COMPLETED).length,
        failed:        docs.filter(d => d.status === ComplaintTriageStatus.FAILED).length,
        pendingReview: docs.filter(d => d.decisionStatus === TriageDecisionStatus.PENDING_REVIEW).length,
        accepted:      docs.filter(d => d.decisionStatus === TriageDecisionStatus.ACCEPTED).length,
        modified:      docs.filter(d => d.decisionStatus === TriageDecisionStatus.MODIFIED).length,
        rejected:      docs.filter(d => d.decisionStatus === TriageDecisionStatus.REJECTED).length,
        ruleBased:     docs.filter(d => d.isRuleBased).length,
        avgUrgency:    docs.length ? Math.round(docs.reduce((s, d) => s + d.urgencyScore, 0) / docs.length) : 0,
      }
      await this.redis.setex(cacheKey, STATS_CACHE_TTL, JSON.stringify(result))
      return result
    } finally { this.computingKeys.delete(cacheKey) }
  }
}
