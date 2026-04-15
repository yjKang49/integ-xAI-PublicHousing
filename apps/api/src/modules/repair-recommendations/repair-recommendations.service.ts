// apps/api/src/modules/repair-recommendations/repair-recommendations.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import { CouchService } from '../../database/couch.service'
import {
  RepairRecommendation, RepairTimeline, RepairRecommendationDraft,
} from '@ax/shared'
import {
  UpdateRepairRecommendationDto,
  ApproveRepairRecommendationDto,
  RepairRecommendationQueryDto,
} from './dto/repair-recommendation.dto'

@Injectable()
export class RepairRecommendationsService {
  private readonly logger = new Logger(RepairRecommendationsService.name)

  constructor(private readonly couch: CouchService) {}

  // ── 워커 결과에서 일괄 생성 ──────────────────────────────────────────────────

  async createFromDrafts(
    orgId: string,
    diagnosisOpinionId: string,
    drafts: RepairRecommendationDraft[],
  ): Promise<string[]> {
    const now = new Date().toISOString()
    const ids: string[] = []

    for (const draft of drafts) {
      const uuid8 = crypto.randomBytes(4).toString('hex')
      const recId = `repairRec:${orgId}:${uuid8}`

      const doc: RepairRecommendation = {
        _id: recId,
        docType: 'repairRecommendation',
        orgId,
        complexId: '', // diagnosisOpinion에서 복사 — 다음 단계에서 채움
        diagnosisOpinionId,
        recommendedAction: draft.recommendedAction,
        actionDetail: draft.actionDetail,
        recommendedTimeline: draft.recommendedTimeline as RepairTimeline,
        priorityRank: draft.priorityRank,
        estimatedCostRange: draft.estimatedCostRange,
        kcsStandardRef: draft.kcsStandardRef,
        kcsComplianceNote: draft.kcsComplianceNote,
        isApproved: false,
        createdAt: now,
        updatedAt: now,
      }

      await this.couch.create(orgId, doc)
      ids.push(recId)
    }

    this.logger.log(`Created ${ids.length} RepairRecommendations for diagnosisOpinionId=${diagnosisOpinionId}`)
    return ids
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    query: RepairRecommendationQueryDto,
  ): Promise<{ items: RepairRecommendation[]; total: number }> {
    const page  = Number(query.page ?? 1)
    const limit = Number(query.limit ?? 20)
    const skip  = (page - 1) * limit

    const selector: any = { docType: 'repairRecommendation', orgId }
    if (query.complexId)          selector.complexId          = query.complexId
    if (query.diagnosisOpinionId) selector.diagnosisOpinionId = query.diagnosisOpinionId
    if (query.defectId)           selector.defectId           = query.defectId
    if (query.isApproved !== undefined) selector.isApproved   = query.isApproved
    if (query.recommendedTimeline) selector.recommendedTimeline = query.recommendedTimeline

    const { docs } = await this.couch.find<RepairRecommendation>(orgId, selector, {
      limit,
      skip,
      sort: [{ priorityRank: 'asc' }],
    })

    return { items: docs, total: docs.length + skip }
  }

  async findByDiagnosisId(orgId: string, diagnosisId: string): Promise<RepairRecommendation[]> {
    const { docs } = await this.couch.find<RepairRecommendation>(
      orgId,
      { docType: 'repairRecommendation', orgId, diagnosisOpinionId: diagnosisId },
      { sort: [{ priorityRank: 'asc' }] },
    )
    return docs
  }

  async findOne(orgId: string, recId: string): Promise<RepairRecommendation> {
    const doc = await this.couch.findById<RepairRecommendation>(orgId, recId)
    if (!doc || doc.docType !== 'repairRecommendation') {
      throw new NotFoundException(`RepairRecommendation ${recId} not found`)
    }
    return doc
  }

  // ── 수정 ────────────────────────────────────────────────────────────────────

  async update(
    orgId: string,
    recId: string,
    dto: UpdateRepairRecommendationDto,
  ): Promise<RepairRecommendation> {
    const doc = await this.findOne(orgId, recId)
    if (doc.isApproved) {
      throw new BadRequestException('승인된 추천은 수정할 수 없습니다.')
    }

    const updated = await this.couch.update(orgId, {
      ...doc,
      ...dto,
      updatedAt: new Date().toISOString(),
    })
    return updated as RepairRecommendation
  }

  // ── 승인 ────────────────────────────────────────────────────────────────────

  async approve(
    orgId: string,
    recId: string,
    dto: ApproveRepairRecommendationDto,
    userId: string,
  ): Promise<RepairRecommendation> {
    const doc = await this.findOne(orgId, recId)
    if (doc.isApproved) {
      throw new BadRequestException('이미 승인된 추천입니다.')
    }

    const now = new Date().toISOString()
    const updated = await this.couch.update(orgId, {
      ...doc,
      isApproved: true,
      approvedBy: userId,
      approvedAt: now,
      approvalNote: dto.approvalNote,
      updatedAt: now,
    })
    return updated as RepairRecommendation
  }

  async cancelApproval(orgId: string, recId: string): Promise<RepairRecommendation> {
    const doc = await this.findOne(orgId, recId)
    if (doc.includedInReportId) {
      throw new BadRequestException('이미 보고서에 포함된 추천은 승인 취소가 불가합니다.')
    }

    const updated = await this.couch.update(orgId, {
      ...doc,
      isApproved: false,
      approvedBy: undefined,
      approvedAt: undefined,
      updatedAt: new Date().toISOString(),
    })
    return updated as RepairRecommendation
  }
}
