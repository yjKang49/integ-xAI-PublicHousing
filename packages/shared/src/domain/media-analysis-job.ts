// packages/shared/src/domain/media-analysis-job.ts
// 미디어 분석 파이프라인 — 미디어 아이템 1개의 단계별 처리 상태 추적

export enum PipelineStageStatus {
  PENDING   = 'PENDING',
  RUNNING   = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  SKIPPED   = 'SKIPPED',   // 해당 없는 단계 (예: 이미지는 frame extraction 스킵)
}

export interface PipelineStage {
  status: PipelineStageStatus
  jobId?: string           // 연관 JobDoc._id
  startedAt?: string
  completedAt?: string
  result?: Record<string, any>
  error?: string
}

/**
 * 미디어 아이템 1개의 분석 파이프라인 상태 문서.
 * 단계 순서: metadataExtraction → frameExtraction (VIDEO만) → aiAnalysis
 */
export interface MediaAnalysisPipeline {
  _id: string              // 'mediaPipeline:{orgId}:{mediaItemId}'
  _rev?: string
  docType: 'mediaPipeline'

  orgId: string
  missionId: string        // 소속 DroneMission._id
  mediaItemId: string      // 대상 DroneMissionMedia.mediaItemId
  storageKey: string       // 원본 미디어 S3 키
  mediaType: 'VIDEO' | 'IMAGE'

  stages: {
    metadataExtraction: PipelineStage
    frameExtraction: PipelineStage   // VIDEO: 실행, IMAGE: SKIPPED
    aiAnalysis: PipelineStage
  }

  overallStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

  /** 프레임 추출 결과: 추출된 프레임 S3 키 목록 */
  extractedFrameKeys?: string[]
  /** 프레임 추출 결과: 총 프레임 수 */
  frameCount?: number

  createdAt: string
  updatedAt: string
}
