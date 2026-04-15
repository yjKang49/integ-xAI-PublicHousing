// apps/api/src/modules/crack-analysis/crack-analysis.service.ts
import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import * as crypto from 'crypto'
import { CouchService } from '../../database/couch.service'
import {
  CrackAnalysisResult,
  CrackAnalysisStatus,
  CrackAnalysisReviewStatus,
  CrackAnalysisPayload,
  JobType,
  SaveCrackAnalysisResultInput,
} from '@ax/shared'
import {
  TriggerCrackAnalysisDto,
  ReviewCrackAnalysisDto,
  CrackAnalysisQueryDto,
  SaveCrackAnalysisResultDto,
} from './dto/crack-analysis.dto'

@Injectable()
export class CrackAnalysisService {
  private readonly logger = new Logger(CrackAnalysisService.name)

  constructor(
    private readonly couchService: CouchService,
    private readonly configService: ConfigService,
    @InjectQueue('ai-queue') private readonly aiQueue: Queue,
  ) {}

  // ── 분석 트리거 ─────────────────────────────────────────────────────────────

  async trigger(orgId: string, dto: TriggerCrackAnalysisDto, userId: string): Promise<{ analysisId: string; jobId: string }> {
    const uuid8 = crypto.randomBytes(4).toString('hex')
    const analysisId = `crackAnalysis:${orgId}:${uuid8}`

    const now = new Date().toISOString()
    const doc: CrackAnalysisResult = {
      _id: analysisId,
      docType: 'crackAnalysis',
      orgId,
      complexId: dto.complexId,
      gaugePointId: dto.gaugePointId,
      measurementId: dto.measurementId,
      capturedImageKey: dto.capturedImageKey,
      roi: dto.roi,
      calibration: {
        mmPerGraduation: dto.mmPerGraduation,
        pxPerMm: dto.manualPxPerMm ?? 0,
        graduationCount: 0,
        avgGraduationSpacingPx: 0,
        isManualCalibration: !!dto.manualPxPerMm,
      },
      confidence: 0,
      analysisStatus: CrackAnalysisStatus.PENDING,
      reviewStatus: CrackAnalysisReviewStatus.PENDING,
      finalWidthMm: 0,
      modelVersion: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    await this.couchService.create(orgId, doc)

    const payload: CrackAnalysisPayload = {
      jobType: JobType.CRACK_ANALYSIS,
      analysisId,
      complexId: dto.complexId,
      gaugePointId: dto.gaugePointId,
      measurementId: dto.measurementId,
      capturedImageKey: dto.capturedImageKey,
      roi: dto.roi,
      mmPerGraduation: dto.mmPerGraduation,
      manualPxPerMm: dto.manualPxPerMm,
      model: dto.model ?? 'MOCK',
      extractMask: dto.extractMask,
      extractSkeleton: dto.extractSkeleton,
      widthSampleCount: dto.widthSampleCount,
    }

    const job = await this.aiQueue.add(JobType.CRACK_ANALYSIS, payload, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false,
    })

    this.logger.log(`CrackAnalysis triggered: analysisId=${analysisId} jobId=${job.id}`)
    return { analysisId, jobId: String(job.id) }
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  async findAll(orgId: string, query: CrackAnalysisQueryDto): Promise<{ items: CrackAnalysisResult[]; total: number }> {
    const page = Number(query.page ?? 1)
    const limit = Number(query.limit ?? 20)
    const skip = (page - 1) * limit

    const selector: any = { docType: 'crackAnalysis', orgId }
    if (query.gaugePointId)  selector.gaugePointId  = query.gaugePointId
    if (query.complexId)     selector.complexId     = query.complexId
    if (query.measurementId) selector.measurementId = query.measurementId
    if (query.analysisStatus) selector.analysisStatus = query.analysisStatus
    if (query.reviewStatus)   selector.reviewStatus   = query.reviewStatus

    const { docs } = await this.couchService.find<CrackAnalysisResult>(orgId, selector, {
      limit,
      skip,
      sort: [{ createdAt: 'desc' }],
    })

    return { items: docs, total: docs.length + skip }
  }

  async findOne(orgId: string, analysisId: string): Promise<CrackAnalysisResult> {
    const doc = await this.couchService.findById<CrackAnalysisResult>(orgId, analysisId)
    if (!doc || doc.docType !== 'crackAnalysis') {
      throw new NotFoundException(`CrackAnalysis ${analysisId} not found`)
    }
    return doc
  }

  // ── 검토 ────────────────────────────────────────────────────────────────────

  async review(orgId: string, analysisId: string, dto: ReviewCrackAnalysisDto, userId: string): Promise<CrackAnalysisResult> {
    const doc = await this.findOne(orgId, analysisId)

    if (doc.analysisStatus !== CrackAnalysisStatus.COMPLETED && doc.analysisStatus !== CrackAnalysisStatus.FAILED) {
      throw new BadRequestException(`분석이 완료되지 않았습니다. 현재 상태: ${doc.analysisStatus}`)
    }
    if (doc.reviewStatus === CrackAnalysisReviewStatus.ACCEPTED || doc.reviewStatus === CrackAnalysisReviewStatus.CORRECTED) {
      throw new BadRequestException('이미 검토가 완료된 분석 결과입니다.')
    }

    const now = new Date().toISOString()
    const updates: Partial<CrackAnalysisResult> = {
      reviewStatus: dto.reviewStatus as CrackAnalysisReviewStatus,
      reviewedBy: userId,
      reviewedAt: now,
      reviewNote: dto.reviewNote,
      updatedAt: now,
    }

    if (dto.reviewStatus === 'CORRECTED' && dto.manualCorrection) {
      updates.manualCorrection = {
        correctedWidthMm: dto.manualCorrection.correctedWidthMm,
        correctedLengthMm: dto.manualCorrection.correctedLengthMm,
        correctionNote: dto.manualCorrection.correctionNote,
        correctedBy: userId,
        correctedAt: now,
      }
      updates.finalWidthMm = dto.manualCorrection.correctedWidthMm
      updates.finalLengthMm = dto.manualCorrection.correctedLengthMm
      updates.analysisStatus = CrackAnalysisStatus.OVERRIDDEN
    }

    const updated = await this.couchService.update(orgId, { ...doc, ...updates })
    return updated as CrackAnalysisResult
  }

  // ── 워커 내부 결과 저장 ──────────────────────────────────────────────────────

  async saveWorkerResult(dto: SaveCrackAnalysisResultDto): Promise<void> {
    const doc = await this.couchService.findById<CrackAnalysisResult>(dto.orgId, dto.analysisId)
    if (!doc || doc.docType !== 'crackAnalysis') {
      this.logger.warn(`saveWorkerResult: analysisId ${dto.analysisId} not found`)
      return
    }

    const now = new Date().toISOString()
    const updates: Partial<CrackAnalysisResult> = {
      analysisStatus: dto.analysisStatus,
      confidence: dto.confidence,
      finalWidthMm: dto.finalWidthMm,
      finalLengthMm: dto.finalLengthMm,
      modelVersion: dto.modelVersion,
      processingTimeMs: dto.processingTimeMs,
      failureReason: dto.failureReason,
      updatedAt: now,
    }

    await this.couchService.update(dto.orgId, { ...doc, ...updates })
    this.logger.log(`CrackAnalysis result saved: ${dto.analysisId} status=${dto.analysisStatus}`)
  }

  // ── 통계 ────────────────────────────────────────────────────────────────────

  async getStats(orgId: string, gaugePointId?: string): Promise<Record<string, number>> {
    const selector: any = { docType: 'crackAnalysis', orgId }
    if (gaugePointId) selector.gaugePointId = gaugePointId

    const { docs } = await this.couchService.find<CrackAnalysisResult>(orgId, selector, { limit: 0 })

    return {
      total: docs.length,
      pending:    docs.filter(d => d.reviewStatus === CrackAnalysisReviewStatus.PENDING).length,
      accepted:   docs.filter(d => d.reviewStatus === CrackAnalysisReviewStatus.ACCEPTED).length,
      corrected:  docs.filter(d => d.reviewStatus === CrackAnalysisReviewStatus.CORRECTED).length,
      rejected:   docs.filter(d => d.reviewStatus === CrackAnalysisReviewStatus.REJECTED).length,
      running:    docs.filter(d => d.analysisStatus === CrackAnalysisStatus.RUNNING).length,
      failed:     docs.filter(d => d.analysisStatus === CrackAnalysisStatus.FAILED).length,
    }
  }
}
