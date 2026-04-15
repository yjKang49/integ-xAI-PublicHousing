// apps/api/src/modules/diagnosis-opinions/diagnosis-opinions.service.ts
import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { CouchService } from '../../database/couch.service'
import { JobsService } from '../jobs/jobs.service'
import { FeatureFlagsService } from '../feature-flags/feature-flags.service'
import { RepairRecommendationsService } from '../repair-recommendations/repair-recommendations.service'
import {
  DiagnosisOpinion,
  DiagnosisOpinionStatus,
  DiagnosisUrgency,
  DiagnosisTargetType,
  DiagnosisEditRecord,
  FeatureFlagKey,
  JobType,
  DiagnosisOpinionPayload,
  RepairRecommendationDraft,
} from '@ax/shared'
import {
  TriggerDiagnosisOpinionDto,
  UpdateDiagnosisOpinionDto,
  ReviewDiagnosisOpinionDto,
  DiagnosisOpinionQueryDto,
  SaveDiagnosisOpinionResultDto,
} from './dto/diagnosis-opinion.dto'

@Injectable()
export class DiagnosisOpinionsService {
  private readonly logger = new Logger(DiagnosisOpinionsService.name)

  constructor(
    private readonly couch: CouchService,
    private readonly jobsService: JobsService,
    private readonly flagsService: FeatureFlagsService,
    private readonly recommendationsService: RepairRecommendationsService,
  ) {}

  // ── 분석 트리거 ─────────────────────────────────────────────────────────────

  async trigger(
    orgId: string,
    dto: TriggerDiagnosisOpinionDto,
    userId: string,
  ): Promise<{ diagnosisId: string; jobId: string }> {
    const flagEnabled = await this.flagsService.isEnabled(FeatureFlagKey.AI_DIAGNOSIS_OPINION, orgId)
    if (!flagEnabled) {
      throw new BadRequestException(
        `Feature flag '${FeatureFlagKey.AI_DIAGNOSIS_OPINION}' 가 비활성화되어 있습니다. ` +
        `관리자에게 활성화를 요청하세요.`,
      )
    }

    const uuid8 = crypto.randomBytes(4).toString('hex')
    const diagnosisId = `diagnosisOpinion:${orgId}:${uuid8}`

    const now = new Date().toISOString()
    const doc: DiagnosisOpinion = {
      _id: diagnosisId,
      docType: 'diagnosisOpinion',
      orgId,
      complexId: dto.complexId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      sessionId: dto.sessionId,
      defectIds: dto.defectIds,
      summary: '',
      technicalOpinionDraft: '',
      urgency: DiagnosisUrgency.ROUTINE,
      estimatedPriorityScore: 0,
      confidence: 0,
      model: dto.model ?? 'MOCK',
      modelVersion: 'pending',
      promptVersion: 'pending',
      status: DiagnosisOpinionStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    }

    await this.couch.create(orgId, doc)

    const payload: DiagnosisOpinionPayload = {
      jobType: JobType.DIAGNOSIS_OPINION,
      diagnosisId,
      complexId: dto.complexId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      sessionId: dto.sessionId,
      defectIds: dto.defectIds,
      model: dto.model ?? 'MOCK',
      language: dto.language ?? 'ko',
    }

    const job = await this.jobsService.create(
      orgId,
      {
        type: JobType.DIAGNOSIS_OPINION,
        payload,
        priority: 'NORMAL',
        complexId: dto.complexId,
      },
      userId,
    )

    // diagnosisJobId 업데이트
    await this.couch.update(orgId, { ...doc, diagnosisJobId: job._id, updatedAt: new Date().toISOString() })

    this.logger.log(`DiagnosisOpinion triggered: diagnosisId=${diagnosisId} jobId=${job._id}`)
    return { diagnosisId, jobId: job._id }
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    query: DiagnosisOpinionQueryDto,
  ): Promise<{ items: DiagnosisOpinion[]; total: number }> {
    const page  = Number(query.page ?? 1)
    const limit = Number(query.limit ?? 20)
    const skip  = (page - 1) * limit

    const selector: any = { docType: 'diagnosisOpinion', orgId }
    if (query.complexId)  selector.complexId  = query.complexId
    if (query.targetType) selector.targetType = query.targetType
    if (query.targetId)   selector.targetId   = query.targetId
    if (query.sessionId)  selector.sessionId  = query.sessionId
    if (query.status)     selector.status     = query.status
    if (query.urgency)    selector.urgency    = query.urgency

    const { docs } = await this.couch.find<DiagnosisOpinion>(orgId, selector, {
      limit,
      skip,
      sort: [{ createdAt: 'desc' }],
    })

    return { items: docs, total: docs.length + skip }
  }

  async findOne(orgId: string, diagnosisId: string): Promise<DiagnosisOpinion> {
    const doc = await this.couch.findById<DiagnosisOpinion>(orgId, diagnosisId)
    if (!doc || doc.docType !== 'diagnosisOpinion') {
      throw new NotFoundException(`DiagnosisOpinion ${diagnosisId} not found`)
    }
    return doc
  }

  // ── 수정 (검토자 편집) ────────────────────────────────────────────────────────

  async update(
    orgId: string,
    diagnosisId: string,
    dto: UpdateDiagnosisOpinionDto,
    userId: string,
  ): Promise<DiagnosisOpinion> {
    const doc = await this.findOne(orgId, diagnosisId)

    if (doc.status === DiagnosisOpinionStatus.APPROVED) {
      throw new BadRequestException('승인된 의견은 수정할 수 없습니다.')
    }

    const now = new Date().toISOString()
    const editHistory: DiagnosisEditRecord[] = [...(doc.editHistory ?? [])]

    const trackableFields: Array<keyof UpdateDiagnosisOpinionDto> = [
      'summary', 'technicalOpinionDraft', 'urgency', 'estimatedPriorityScore',
    ]
    for (const field of trackableFields) {
      if (dto[field] !== undefined && dto[field] !== (doc as any)[field]) {
        editHistory.push({
          field: field as any,
          previousValue: String((doc as any)[field] ?? ''),
          newValue: String(dto[field]),
          editedBy: userId,
          editedAt: now,
        })
      }
    }

    const updated = await this.couch.update(orgId, {
      ...doc,
      ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
      ...(dto.technicalOpinionDraft !== undefined ? { technicalOpinionDraft: dto.technicalOpinionDraft } : {}),
      ...(dto.urgency !== undefined ? { urgency: dto.urgency } : {}),
      ...(dto.estimatedPriorityScore !== undefined ? { estimatedPriorityScore: dto.estimatedPriorityScore } : {}),
      status: DiagnosisOpinionStatus.REVIEWING,
      editHistory,
      updatedAt: now,
    })

    return updated as DiagnosisOpinion
  }

  // ── 검토 (승인/기각/재검토) ───────────────────────────────────────────────────

  async review(
    orgId: string,
    diagnosisId: string,
    dto: ReviewDiagnosisOpinionDto,
    userId: string,
  ): Promise<DiagnosisOpinion> {
    const doc = await this.findOne(orgId, diagnosisId)

    if (doc.status === DiagnosisOpinionStatus.APPROVED) {
      throw new BadRequestException('이미 승인된 의견입니다.')
    }
    if (doc.status === DiagnosisOpinionStatus.DRAFT && !doc.summary) {
      throw new BadRequestException('아직 AI 분석이 완료되지 않았습니다.')
    }

    const now = new Date().toISOString()

    let newStatus: DiagnosisOpinionStatus
    switch (dto.action) {
      case 'APPROVE':           newStatus = DiagnosisOpinionStatus.APPROVED; break
      case 'REJECT':            newStatus = DiagnosisOpinionStatus.REJECTED; break
      case 'REQUEST_REVISION':  newStatus = DiagnosisOpinionStatus.REVIEWING; break
    }

    const updates: Partial<DiagnosisOpinion> = {
      status: newStatus,
      reviewedBy: userId,
      reviewedAt: now,
      reviewNote: dto.reviewNote,
      updatedAt: now,
    }

    // 최종 수정 반영
    if (dto.finalEdits) {
      if (dto.finalEdits.summary !== undefined) updates.summary = dto.finalEdits.summary
      if (dto.finalEdits.technicalOpinionDraft !== undefined) updates.technicalOpinionDraft = dto.finalEdits.technicalOpinionDraft
      if (dto.finalEdits.urgency !== undefined) updates.urgency = dto.finalEdits.urgency
      if (dto.finalEdits.estimatedPriorityScore !== undefined) updates.estimatedPriorityScore = dto.finalEdits.estimatedPriorityScore
    }

    const updated = await this.couch.update(orgId, { ...doc, ...updates })
    this.logger.log(`DiagnosisOpinion ${dto.action}: ${diagnosisId} by ${userId}`)
    return updated as DiagnosisOpinion
  }

  // ── 워커 내부 결과 저장 ──────────────────────────────────────────────────────

  async saveWorkerResult(dto: SaveDiagnosisOpinionResultDto): Promise<void> {
    const doc = await this.couch.findById<DiagnosisOpinion>(dto.orgId, dto.diagnosisId)
    if (!doc || doc.docType !== 'diagnosisOpinion') {
      this.logger.warn(`saveWorkerResult: diagnosisId ${dto.diagnosisId} not found`)
      return
    }

    const now = new Date().toISOString()
    await this.couch.update(dto.orgId, {
      ...doc,
      status: dto.status,
      summary: dto.summary,
      technicalOpinionDraft: dto.technicalOpinionDraft,
      urgency: dto.urgency as DiagnosisUrgency,
      estimatedPriorityScore: dto.estimatedPriorityScore,
      confidence: dto.confidence,
      model: dto.model,
      modelVersion: dto.modelVersion,
      promptVersion: dto.promptVersion,
      tokensUsed: dto.tokensUsed,
      processingTimeMs: dto.processingTimeMs,
      failureReason: dto.failureReason,
      updatedAt: now,
    })

    this.logger.log(`DiagnosisOpinion result saved: ${dto.diagnosisId} urgency=${dto.urgency}`)
  }

  /** 워커가 전달한 추천 초안들을 RepairRecommendation 문서로 저장 */
  async saveRecommendationDrafts(
    orgId: string,
    diagnosisId: string,
    drafts: RepairRecommendationDraft[],
  ): Promise<string[]> {
    const ids = await this.recommendationsService.createFromDrafts(orgId, diagnosisId, drafts)
    // recommendationIds 필드 업데이트
    const doc = await this.couch.findById<DiagnosisOpinion>(orgId, diagnosisId)
    if (doc) {
      await this.couch.update(orgId, {
        ...doc,
        recommendationIds: ids,
        updatedAt: new Date().toISOString(),
      })
    }
    return ids
  }

  // ── 통계 ────────────────────────────────────────────────────────────────────

  async getStats(orgId: string, complexId?: string): Promise<Record<string, number>> {
    const selector: any = { docType: 'diagnosisOpinion', orgId }
    if (complexId) selector.complexId = complexId

    const { docs } = await this.couch.find<DiagnosisOpinion>(orgId, selector, { limit: 0 })

    return {
      total: docs.length,
      draft:     docs.filter(d => d.status === DiagnosisOpinionStatus.DRAFT).length,
      reviewing: docs.filter(d => d.status === DiagnosisOpinionStatus.REVIEWING).length,
      approved:  docs.filter(d => d.status === DiagnosisOpinionStatus.APPROVED).length,
      rejected:  docs.filter(d => d.status === DiagnosisOpinionStatus.REJECTED).length,
      immediate: docs.filter(d => d.urgency === DiagnosisUrgency.IMMEDIATE).length,
      urgent:    docs.filter(d => d.urgency === DiagnosisUrgency.URGENT).length,
    }
  }
}
