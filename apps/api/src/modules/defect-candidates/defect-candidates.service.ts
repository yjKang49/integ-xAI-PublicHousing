// apps/api/src/modules/defect-candidates/defect-candidates.service.ts
import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import { v4 as uuid } from 'uuid'
import { CouchService } from '../../database/couch.service'
import {
  DetectedDefectCandidate, CandidateReviewStatus, CandidateDefectType,
  BatchCreateCandidatesInput, DefectCandidateQueryOptions,
} from '@ax/shared'
import { getConfidenceLevel, KCS_REF_BY_DEFECT_TYPE } from '@ax/shared'
import { ReviewCandidateDto, PromoteCandidateDto } from './dto/defect-candidate.dto'

// DefectsService는 순환참조 방지를 위해 직접 CouchDB로 접근
import { Defect } from '@ax/shared'
import { SeverityLevel, DefectType } from '@ax/shared'

const CACHE_TTL = 10

// 결함 유형 매핑: CandidateDefectType → DefectType
const CANDIDATE_TO_DEFECT_TYPE: Partial<Record<CandidateDefectType, string>> = {
  [CandidateDefectType.CRACK]:              DefectType.CRACK,
  [CandidateDefectType.LEAK]:               DefectType.LEAK,
  [CandidateDefectType.DELAMINATION]:       DefectType.SPALLING,
  [CandidateDefectType.SPOILING]:           DefectType.OTHER,
  [CandidateDefectType.CORROSION]:          DefectType.CORROSION,
  [CandidateDefectType.EFFLORESCENCE]:      DefectType.EFFLORESCENCE,
  [CandidateDefectType.FIRE_RISK_CLADDING]: DefectType.OTHER,
  [CandidateDefectType.OTHER]:              DefectType.OTHER,
}

@Injectable()
export class DefectCandidatesService {
  private readonly logger = new Logger(DefectCandidatesService.name)
  private readonly computingKeys = new Set<string>()

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ── 배치 생성 (워커 → API 내부 호출) ──────────────────────────────────────────

  async batchCreate(
    input: BatchCreateCandidatesInput,
  ): Promise<{ created: number; candidates: DetectedDefectCandidate[] }> {
    const now = new Date().toISOString()
    const created: DetectedDefectCandidate[] = []

    for (const det of input.detections) {
      const shortId = uuid().replace(/-/g, '').slice(0, 8)
      const docId = `defectCandidate:${input.orgId}:${shortId}`
      const confidenceLevel = getConfidenceLevel(det.confidence)

      const doc: DetectedDefectCandidate = {
        _id: docId,
        docType: 'defectCandidate',
        orgId: input.orgId,
        complexId: input.complexId,
        ...(input.buildingId      && { buildingId:      input.buildingId }),
        sourceType:    input.sourceType as any,
        sourceMediaId: input.sourceMediaId,
        ...(input.sourceMissionId && { sourceMissionId: input.sourceMissionId }),
        ...(input.sourceFrameId   && { sourceFrameId:   input.sourceFrameId }),
        storageKey:    input.storageKey,
        defectType:    det.defectType,
        confidence:    det.confidence,
        confidenceLevel,
        bbox:          det.bbox,
        ...(det.suggestedSeverity  && { suggestedSeverity: det.suggestedSeverity }),
        ...(det.aiCaption          && { aiCaption:          det.aiCaption }),
        ...(det.kcsStandardRef     && { kcsStandardRef:     det.kcsStandardRef }),
        ...(det.kcsExceedsLimit !== undefined && { kcsExceedsLimit: det.kcsExceedsLimit }),
        modelVersion:    input.modelVersion,
        detectionMethod: input.detectionMethod,
        reviewStatus:    CandidateReviewStatus.PENDING,
        detectionJobId:  input.jobDocId,
        createdAt: now,
        updatedAt: now,
      }

      const saved = await this.couch.create(input.orgId, doc)
      created.push(saved as DetectedDefectCandidate)
    }

    this.logger.log(
      `DefectCandidates batch created: count=${created.length} jobId=${input.jobDocId} org=${input.orgId}`,
    )
    return { created: created.length, candidates: created }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    query: DefectCandidateQueryOptions,
  ): Promise<{ data: DetectedDefectCandidate[]; meta: { total: number; page: number; limit: number; hasNext: boolean } }> {
    const cacheKey = `defectCandidates:list:${orgId}:${JSON.stringify(query)}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Cache stampede prevention: poll until the computing request finishes
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150))
      const retry = await this.redis.get(cacheKey)
      if (retry) return JSON.parse(retry)
    }

    this.computingKeys.add(cacheKey)
    // Double-check cache after acquiring lock (another request may have just finished)
    const fresh = await this.redis.get(cacheKey)
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh) }

    try {
      const selector: Record<string, any> = { docType: 'defectCandidate', orgId }
      if (query.complexId)       selector.complexId       = query.complexId
      if (query.buildingId)      selector.buildingId      = query.buildingId
      if (query.sourceType)      selector.sourceType      = query.sourceType
      if (query.sourceMissionId) selector.sourceMissionId = query.sourceMissionId
      if (query.defectType)      selector.defectType      = query.defectType
      if (query.reviewStatus)    selector.reviewStatus    = query.reviewStatus
      if (query.confidenceLevel) selector.confidenceLevel = query.confidenceLevel

      const page  = Math.max(1, query.page  ?? 1)
      const limit = query.limit === 0 ? 10000 : Math.min(query.limit ?? 20, 100)

      const { docs } = await this.couch.find<DetectedDefectCandidate>(orgId, selector, {
        limit: limit + 1,
        skip: (page - 1) * limit,
        sort: [{ createdAt: 'desc' }],
      })

      const hasNext = docs.length > limit
      const data = hasNext ? docs.slice(0, limit) : docs
      const total = hasNext ? page * limit + 1 : (page - 1) * limit + data.length
      const result = { data, meta: { total, page, limit, hasNext } }
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
      return result
    } finally {
      this.computingKeys.delete(cacheKey)
    }
  }

  async findById(orgId: string, id: string): Promise<DetectedDefectCandidate> {
    const doc = await this.couch.findById<DetectedDefectCandidate>(orgId, id)
    if (!doc || (doc as any)._deleted) {
      throw new NotFoundException(`DefectCandidate ${id} 를 찾을 수 없습니다.`)
    }
    return doc
  }

  // ── 검토 (승인 / 기각) ────────────────────────────────────────────────────────

  async review(
    orgId: string,
    candidateId: string,
    dto: ReviewCandidateDto,
    userId: string,
  ): Promise<DetectedDefectCandidate> {
    const candidate = await this.findById(orgId, candidateId)

    if (candidate.reviewStatus === CandidateReviewStatus.PROMOTED) {
      throw new BadRequestException('이미 Defect로 승격된 후보는 검토 상태를 변경할 수 없습니다.')
    }

    const now = new Date().toISOString()
    const updated: DetectedDefectCandidate = {
      ...candidate,
      reviewStatus: dto.reviewStatus as CandidateReviewStatus,
      reviewedBy:   userId,
      reviewedAt:   now,
      ...(dto.reviewNote !== undefined && { reviewNote: dto.reviewNote }),
      updatedAt: now,
    }

    const saved = await this.couch.update(orgId, updated)
    this.logger.log(
      `DefectCandidate reviewed: id=${candidateId} status=${dto.reviewStatus} by=${userId}`,
    )
    return saved as DetectedDefectCandidate
  }

  // ── Defect 승격 ────────────────────────────────────────────────────────────────

  async promoteToDefect(
    orgId: string,
    candidateId: string,
    dto: PromoteCandidateDto,
    userId: string,
  ): Promise<{ candidate: DetectedDefectCandidate; defect: Defect }> {
    const candidate = await this.findById(orgId, candidateId)

    if (candidate.reviewStatus === CandidateReviewStatus.REJECTED) {
      throw new BadRequestException('기각된 후보는 Defect로 승격할 수 없습니다.')
    }
    if (candidate.reviewStatus === CandidateReviewStatus.PROMOTED) {
      throw new BadRequestException('이미 Defect로 승격된 후보입니다.')
    }

    const now = new Date().toISOString()

    // ── Defect 문서 생성 ──────────────────────────────────────────────────────
    const defectId = `defect:${orgId}:def_${Date.now()}_${uuid().slice(0, 8)}`

    const resolvedDefectType =
      dto.defectType ??
      CANDIDATE_TO_DEFECT_TYPE[candidate.defectType] ??
      DefectType.OTHER

    const resolvedSeverity = (dto.severity ?? candidate.suggestedSeverity ?? SeverityLevel.MEDIUM) as SeverityLevel

    const defect: Defect = {
      _id: defectId,
      docType: 'defect',
      orgId,
      complexId:  candidate.complexId,
      ...(candidate.buildingId && { buildingId: candidate.buildingId }),
      // sessionId / projectId는 승격 DTO에서 제공
      sessionId:  dto.sessionId  ?? '',
      projectId:  dto.projectId  ?? '',
      defectType: resolvedDefectType,
      severity:   resolvedSeverity,
      description: dto.description ?? candidate.aiCaption ?? `AI 탐지 결함 (${candidate.defectType}) — ${(candidate.confidence * 100).toFixed(0)}% 신뢰도`,
      locationDescription: dto.locationDescription ?? `후보 ID: ${candidateId}`,
      mediaIds:   [],
      isRepaired: false,
      // AX-SPRINT AI 진단 필드
      aiDetectionMethod: candidate.detectionMethod,
      aiConfidence:      candidate.confidence,
      aiCaption:         candidate.aiCaption,
      kcsStandardRef:    candidate.kcsStandardRef,
      kcsExceedsLimit:   candidate.kcsExceedsLimit,
      isAiAutoAccepted:  candidate.confidenceLevel === 'AUTO_ACCEPT',
      isDroneDetected:   ['DRONE_FRAME', 'DRONE_IMAGE'].includes(candidate.sourceType),
      createdAt:  now,
      updatedAt:  now,
      createdBy:  userId,
      updatedBy:  userId,
    } as Defect

    const savedDefect = await this.couch.create(orgId, defect)

    // ── 후보 상태 업데이트 ─────────────────────────────────────────────────────
    const updatedCandidate: DetectedDefectCandidate = {
      ...candidate,
      reviewStatus:      CandidateReviewStatus.PROMOTED,
      reviewedBy:        userId,
      reviewedAt:        now,
      promotedDefectId:  defectId,
      updatedAt:         now,
    }
    const savedCandidate = await this.couch.update(orgId, updatedCandidate)

    this.logger.log(
      `DefectCandidate promoted: candidateId=${candidateId} defectId=${defectId} by=${userId}`,
    )
    return {
      candidate: savedCandidate as DetectedDefectCandidate,
      defect:    savedDefect    as Defect,
    }
  }
}
