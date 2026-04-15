// packages/shared/src/domain/drone-mission.ts
// 드론 점검 미션 도메인 — 영상/이미지 업로드 및 분석 파이프라인 진입점

// ── 상태 ─────────────────────────────────────────────────────────────────

export enum DroneMissionStatus {
  CREATED    = 'CREATED',     // 미션 생성됨 (파일 없음)
  UPLOADING  = 'UPLOADING',   // 파일 업로드 진행 중
  UPLOADED   = 'UPLOADED',    // 모든 파일 업로드 완료, 처리 대기
  PROCESSING = 'PROCESSING',  // 프레임 추출 / AI 분석 진행 중
  COMPLETED  = 'COMPLETED',   // 분석 완료
  FAILED     = 'FAILED',      // 처리 실패
}

export enum DroneMediaItemStatus {
  PENDING    = 'PENDING',     // 업로드 대기 (pre-signed URL 발급됨)
  UPLOADED   = 'UPLOADED',    // S3 업로드 완료
  EXTRACTING = 'EXTRACTING',  // 프레임 추출 / 메타데이터 추출 중
  DONE       = 'DONE',        // 처리 완료
  FAILED     = 'FAILED',      // 처리 실패
}

export type DroneMediaItemType = 'VIDEO' | 'IMAGE'

// ── GPS ────────────────────────────────────────────────────────────────────

export interface GpsPoint {
  lat: number
  lng: number
  alt?: number           // 고도 (m)
  timestamp?: string     // ISO 8601
}

// ── 미디어 아이템 (미션에 임베드) ───────────────────────────────────────────

export interface DroneMissionMedia {
  mediaItemId: string    // uuid
  fileName: string
  mimeType: string
  fileSize: number       // bytes
  mediaType: DroneMediaItemType
  storageKey: string     // S3 키 (드론 미디어 경로 규칙 적용)
  status: DroneMediaItemStatus
  uploadedAt?: string    // S3 업로드 완료 시각
  capturedAt?: string    // 촬영 시각 (EXIF 또는 사용자 입력)
  gpsLat?: number
  gpsLng?: number
  gpsAlt?: number
  /** 영상일 경우 추출된 프레임 수 */
  frameCount?: number
  /** 메타데이터 추출 결과 */
  metadata?: VideoMeta | ImageMeta
  /** 연관 Job ID (프레임 추출 / 메타데이터 추출) */
  extractionJobId?: string
}

export interface VideoMeta {
  durationSec: number
  fps: number
  width: number
  height: number
  codec?: string
  bitratekbps?: number
}

export interface ImageMeta {
  width: number
  height: number
  dpi?: number
  colorSpace?: string
  /** EXIF 원본 데이터 (선택적 — 대용량이므로 축약) */
  exif?: Record<string, string | number>
}

// ── 미션 문서 ───────────────────────────────────────────────────────────────

export interface DroneMission {
  _id: string            // 'droneMission:{orgId}:{shortId}'
  _rev?: string
  docType: 'droneMission'

  orgId: string
  complexId: string
  buildingId?: string    // 특정 동에 한정된 미션
  sessionId?: string     // 연결된 InspectionSession (선택)

  title: string
  description?: string

  status: DroneMissionStatus

  pilot: string          // 조종사 이름 또는 userId
  flightDate: string     // 비행 날짜 (YYYY-MM-DD)
  droneModel?: string    // 드론 기종 (예: DJI Mavic 3)
  weatherCondition?: string

  /** 업로드된 미디어 항목 목록 (영상 + 이미지 혼합 가능) */
  mediaItems: DroneMissionMedia[]

  /** 연관 비동기 Job ID 목록 (프레임 추출, AI 분석 등) */
  jobIds: string[]

  /** 추출 완료된 총 프레임 수 */
  totalFrameCount?: number
  /** AI 탐지된 결함 수 */
  detectionCount?: number

  /** 비행 경로 GPS 좌표 목록 */
  gpsTrack?: GpsPoint[]

  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

// ── DTO (API 입출력) ────────────────────────────────────────────────────────

export interface CreateDroneMissionInput {
  complexId: string
  buildingId?: string
  sessionId?: string
  title: string
  description?: string
  pilot: string
  flightDate: string     // YYYY-MM-DD
  droneModel?: string
  weatherCondition?: string
  gpsTrack?: GpsPoint[]
}

export interface InitDroneMediaUploadInput {
  fileName: string
  mimeType: string
  fileSize: number       // bytes
  mediaType: DroneMediaItemType
  capturedAt?: string
}

export interface InitDroneMediaUploadResult {
  mediaItemId: string
  uploadUrl: string      // S3 pre-signed PUT (10분 유효)
  storageKey: string
}

export interface CompleteDroneMediaUploadInput {
  capturedAt?: string
  gpsLat?: number
  gpsLng?: number
  gpsAlt?: number
}
