// packages/shared/src/domain/media-frame.ts
// 드론 영상에서 추출된 단일 프레임 문서

export interface MediaFrame {
  _id: string            // 'mediaFrame:{orgId}:{missionId}:{frameIndex:06d}'
  _rev?: string
  docType: 'mediaFrame'

  orgId: string
  missionId: string      // DroneMission._id
  mediaItemId: string    // 원본 DroneMissionMedia.mediaItemId

  /** S3 키 — 추출된 프레임 이미지 경로 */
  storageKey: string

  /** 영상 내 순서 (0-based) */
  frameIndex: number

  /** 영상 내 타임스탬프 (밀리초) */
  timestampMs: number

  /** 프레임 이미지 크기 (bytes) */
  fileSize?: number

  /** 프레임 이미지 해상도 */
  width?: number
  height?: number

  /** AI 분석 결과 (ai-queue 처리 후 채워짐) */
  aiResult?: {
    detections: FrameDetection[]
    analysisJobId: string
    modelVersion: string
    analysedAt: string
  }

  /** AI 분석 Job ID (처리 전 예약) */
  aiAnalysisJobId?: string

  createdAt: string
}

export interface FrameDetection {
  defectType: string        // CRACK | SPALLING | LEAK | CORROSION | etc.
  confidence: number        // 0~1
  confidenceLevel: string   // AUTO_ACCEPT | REQUIRES_REVIEW | MANUAL_REQUIRED
  severity: string          // LOW | MEDIUM | HIGH | CRITICAL
  /** 바운딩 박스 [x, y, w, h] (0~1 비율) */
  boundingBox: [number, number, number, number]
  kcsStandardRef?: string   // KCS 기준 참조
  aiCaption?: string
}

/** 프레임 목록 조회 파라미터 */
export interface MediaFrameQueryOptions {
  missionId?: string
  mediaItemId?: string
  page?: number
  limit?: number
}
