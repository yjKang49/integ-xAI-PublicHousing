// apps/api/src/modules/media-analysis/media-analysis.service.ts
// MediaAnalysisPipeline — 미디어 분석 파이프라인 상태 추적 서비스
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CouchService } from '../../database/couch.service'
import { MediaAnalysisPipeline, PipelineStage, PipelineStageStatus } from '@ax/shared'

@Injectable()
export class MediaAnalysisService {
  private readonly logger = new Logger(MediaAnalysisService.name)

  constructor(private readonly couch: CouchService) {}

  // ── 파이프라인 생성 ─────────────────────────────────────────────────────────

  async createPipeline(
    orgId: string,
    params: {
      missionId: string
      mediaItemId: string
      storageKey: string
      mediaType: 'VIDEO' | 'IMAGE'
    },
  ): Promise<MediaAnalysisPipeline> {
    const now = new Date().toISOString()
    const docId = `mediaPipeline:${orgId}:${params.mediaItemId}`

    const pipeline: MediaAnalysisPipeline = {
      _id: docId,
      docType: 'mediaPipeline',
      orgId,
      missionId: params.missionId,
      mediaItemId: params.mediaItemId,
      storageKey: params.storageKey,
      mediaType: params.mediaType,
      stages: {
        metadataExtraction: { status: PipelineStageStatus.PENDING },
        frameExtraction: {
          status: params.mediaType === 'VIDEO'
            ? PipelineStageStatus.PENDING
            : PipelineStageStatus.SKIPPED,
        },
        aiAnalysis: { status: PipelineStageStatus.PENDING },
      },
      overallStatus: 'PENDING',
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.couch.create(orgId, pipeline)
    this.logger.log(`Pipeline created: ${docId} type=${params.mediaType}`)
    return saved as MediaAnalysisPipeline
  }

  // ── 파이프라인 조회 ─────────────────────────────────────────────────────────

  async findByMediaItemId(orgId: string, mediaItemId: string): Promise<MediaAnalysisPipeline | null> {
    const docId = `mediaPipeline:${orgId}:${mediaItemId}`
    const doc = await this.couch.findById<MediaAnalysisPipeline>(orgId, docId)
    return doc && !(doc as any)._deleted ? doc : null
  }

  async findByMissionId(orgId: string, missionId: string): Promise<MediaAnalysisPipeline[]> {
    const { docs } = await this.couch.find<MediaAnalysisPipeline>(
      orgId,
      { docType: 'mediaPipeline', orgId, missionId },
      { limit: 200, sort: [{ createdAt: 'asc' }] },
    )
    return docs
  }

  // ── 단계별 상태 업데이트 ─────────────────────────────────────────────────────

  async updateStage(
    orgId: string,
    mediaItemId: string,
    stage: keyof MediaAnalysisPipeline['stages'],
    update: {
      status: PipelineStageStatus
      jobId?: string
      result?: Record<string, any>
      error?: string
    },
  ): Promise<MediaAnalysisPipeline> {
    const docId = `mediaPipeline:${orgId}:${mediaItemId}`
    const doc = await this.couch.findById<MediaAnalysisPipeline>(orgId, docId)
    if (!doc) throw new NotFoundException(`Pipeline ${docId} 를 찾을 수 없습니다.`)

    const now = new Date().toISOString()
    const updatedStages = {
      ...doc.stages,
      [stage]: {
        ...doc.stages[stage],
        ...update,
        ...(update.status === PipelineStageStatus.RUNNING   && { startedAt:   now }),
        ...(update.status === PipelineStageStatus.COMPLETED && { completedAt: now }),
        ...(update.status === PipelineStageStatus.FAILED    && { completedAt: now }),
      },
    }

    const overallStatus = this.computeOverallStatus(updatedStages)

    const updated: MediaAnalysisPipeline = {
      ...doc,
      stages: updatedStages,
      overallStatus,
      updatedAt: now,
    }

    return this.couch.update(orgId, updated) as Promise<MediaAnalysisPipeline>
  }

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────

  private computeOverallStatus(
    stages: MediaAnalysisPipeline['stages'],
  ): 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' {
    const values = (Object.values(stages) as PipelineStage[]).map(s => s.status)
    if (values.some(s => s === PipelineStageStatus.FAILED)) return 'FAILED'
    if (values.every(s =>
      s === PipelineStageStatus.COMPLETED || s === PipelineStageStatus.SKIPPED,
    )) return 'COMPLETED'
    if (values.some(s => s === PipelineStageStatus.RUNNING)) return 'RUNNING'
    return 'PENDING'
  }
}
