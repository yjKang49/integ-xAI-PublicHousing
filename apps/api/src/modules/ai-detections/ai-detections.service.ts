// apps/api/src/modules/ai-detections/ai-detections.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { JobsService } from '../jobs/jobs.service'
import { FeatureFlagsService } from '../feature-flags/feature-flags.service'
import { DefectCandidatesService } from '../defect-candidates/defect-candidates.service'
import { DroneMissionsService } from '../drone-missions/drone-missions.service'
import {
  JobType, FeatureFlagKey, CandidateReviewStatus,
  CandidateSourceType, DefectCandidateQueryOptions,
} from '@ax/shared'
import { TriggerDetectionDto, TriggerMissionDetectionDto } from './dto/ai-detection.dto'
import { DroneMediaItemStatus } from '@ax/shared'

@Injectable()
export class AiDetectionsService {
  private readonly logger = new Logger(AiDetectionsService.name)

  constructor(
    private readonly jobsService: JobsService,
    private readonly flagsService: FeatureFlagsService,
    private readonly candidatesService: DefectCandidatesService,
    private readonly droneMissionsService: DroneMissionsService,
  ) {}

  // ── 단일 이미지 탐지 트리거 ────────────────────────────────────────────────────

  async triggerDetection(
    orgId: string,
    dto: TriggerDetectionDto,
    userId: string,
  ) {
    const flagEnabled = await this.flagsService.isEnabled(
      FeatureFlagKey.AI_DEFECT_DETECTION,
      orgId,
    )
    if (!flagEnabled) {
      throw new BadRequestException(
        `Feature flag '${FeatureFlagKey.AI_DEFECT_DETECTION}' 가 비활성화되어 있습니다. 관리자에게 활성화를 요청하세요.`,
      )
    }

    const job = await this.jobsService.create(orgId, {
      type: JobType.DEFECT_DETECTION,
      payload: {
        complexId:          dto.complexId,
        ...(dto.buildingId      && { buildingId:      dto.buildingId }),
        sourceType:         dto.sourceType,
        sourceMediaId:      dto.sourceMediaId,
        ...(dto.sourceMissionId && { sourceMissionId: dto.sourceMissionId }),
        ...(dto.sourceFrameId   && { sourceFrameId:   dto.sourceFrameId }),
        storageKey:         dto.storageKey,
        model:              dto.model ?? 'MOCK',
        confidenceThreshold: dto.confidenceThreshold ?? 0.5,
        maxDetections:       dto.maxDetections ?? 20,
      },
      priority: 'NORMAL',
      complexId: dto.complexId,
    }, userId)

    this.logger.log(
      `DEFECT_DETECTION job created: jobId=${job._id} sourceMediaId=${dto.sourceMediaId} org=${orgId}`,
    )
    return { jobId: job._id, status: job.status }
  }

  // ── 드론 미션 전체 이미지 일괄 탐지 트리거 ──────────────────────────────────────

  async triggerMissionDetection(
    orgId: string,
    missionId: string,
    dto: TriggerMissionDetectionDto,
    userId: string,
  ): Promise<{ jobsCreated: number; jobIds: string[] }> {
    const flagEnabled = await this.flagsService.isEnabled(
      FeatureFlagKey.AI_DEFECT_DETECTION,
      orgId,
    )
    if (!flagEnabled) {
      throw new BadRequestException(
        `Feature flag '${FeatureFlagKey.AI_DEFECT_DETECTION}' 가 비활성화되어 있습니다.`,
      )
    }

    const mission = await this.droneMissionsService.findById(orgId, missionId)
    const jobIds: string[] = []

    for (const item of mission.mediaItems) {
      if (item.status !== DroneMediaItemStatus.DONE) continue

      const sourceType = item.mediaType === 'VIDEO'
        ? CandidateSourceType.DRONE_FRAME
        : CandidateSourceType.DRONE_IMAGE

      const job = await this.jobsService.create(orgId, {
        type: JobType.DEFECT_DETECTION,
        payload: {
          complexId:          mission.complexId,
          ...(mission.buildingId && { buildingId: mission.buildingId }),
          sourceType,
          sourceMediaId:      item.mediaItemId,
          sourceMissionId:    missionId,
          storageKey:         item.storageKey,
          model:              dto.model ?? 'MOCK',
          confidenceThreshold: dto.confidenceThreshold ?? 0.5,
          maxDetections:       20,
        },
        priority: 'NORMAL',
        complexId: mission.complexId,
      }, userId)

      jobIds.push(job._id)
      this.logger.log(
        `DEFECT_DETECTION job queued: mediaItemId=${item.mediaItemId} jobId=${job._id}`,
      )
    }

    return { jobsCreated: jobIds.length, jobIds }
  }

  // ── 미션별 후보 조회 ───────────────────────────────────────────────────────────

  async listMissionCandidates(orgId: string, missionId: string, query: {
    defectType?: string
    reviewStatus?: string
    page?: number
    limit?: number
  }) {
    return this.candidatesService.findAll(orgId, {
      sourceMissionId: missionId,
      defectType:      query.defectType   as any,
      reviewStatus:    query.reviewStatus as any,
      page:            query.page,
      limit:           query.limit,
    })
  }

  // ── 탐지 통계 ──────────────────────────────────────────────────────────────────

  async getDetectionStats(orgId: string, complexId?: string) {
    const q: DefectCandidateQueryOptions = { ...(complexId && { complexId }) }
    const { data: pending }  = await this.candidatesService.findAll(orgId, { ...q, reviewStatus: CandidateReviewStatus.PENDING,  limit: 0 })
    const { data: approved } = await this.candidatesService.findAll(orgId, { ...q, reviewStatus: CandidateReviewStatus.APPROVED, limit: 0 })
    const { data: rejected } = await this.candidatesService.findAll(orgId, { ...q, reviewStatus: CandidateReviewStatus.REJECTED, limit: 0 })
    const { data: promoted } = await this.candidatesService.findAll(orgId, { ...q, reviewStatus: CandidateReviewStatus.PROMOTED, limit: 0 })

    return {
      pending:  pending.length,
      approved: approved.length,
      rejected: rejected.length,
      promoted: promoted.length,
      total:    pending.length + approved.length + rejected.length + promoted.length,
    }
  }
}
