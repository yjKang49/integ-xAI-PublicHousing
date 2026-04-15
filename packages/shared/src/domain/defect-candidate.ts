// packages/shared/src/domain/defect-candidate.ts
// AI 자동 탐지 결함 후보 — human-in-the-loop 검토 후 Defect로 승격

// ── 결함 유형 (탐지 전용) ──────────────────────────────────────────────────────

export enum CandidateDefectType {
  CRACK              = 'CRACK',              // 균열
  LEAK               = 'LEAK',               // 누수
  DELAMINATION       = 'DELAMINATION',       // 박리/박락
  SPOILING           = 'SPOILING',           // 오손/오염
  CORROSION          = 'CORROSION',          // 부식
  EFFLORESCENCE      = 'EFFLORESCENCE',      // 백태
  FIRE_RISK_CLADDING = 'FIRE_RISK_CLADDING', // 화재위험 외장재
  OTHER              = 'OTHER',
}

// ── 소스 유형 ──────────────────────────────────────────────────────────────────

export enum CandidateSourceType {
  DRONE_FRAME  = 'DRONE_FRAME',   // 드론 영상에서 추출된 프레임
  DRONE_IMAGE  = 'DRONE_IMAGE',   // 드론 정지 이미지
  MOBILE_PHOTO = 'MOBILE_PHOTO',  // 모바일 현장 사진
  MANUAL       = 'MANUAL',        // 수동 업로드
}

// ── 검토 상태 ──────────────────────────────────────────────────────────────────

export enum CandidateReviewStatus {
  PENDING  = 'PENDING',   // 검토 대기
  APPROVED = 'APPROVED',  // 검토 승인 (아직 Defect로 승격 전)
  REJECTED = 'REJECTED',  // 기각 (결함 아님)
  PROMOTED = 'PROMOTED',  // Defect로 승격 완료
}

// ── 도메인 문서 ────────────────────────────────────────────────────────────────

/**
 * DetectedDefectCandidate — AI 자동 탐지 결함 후보 문서
 * _id 패턴: defectCandidate:{orgId}:{uuid8}
 */
export interface DetectedDefectCandidate {
  _id: string
  _rev?: string
  docType: 'defectCandidate'

  orgId: string
  complexId: string
  buildingId?: string

  // ── 소스 ────────────────────────────────────────────────────────────────────
  /** 탐지 입력 소스 유형 */
  sourceType: CandidateSourceType
  /** 소스 미디어 식별자 (mediaItemId 또는 DefectMedia._id) */
  sourceMediaId: string
  /** 드론 미션 ID (sourceType이 DRONE_* 인 경우) */
  sourceMissionId?: string
  /** 드론 프레임 _id (sourceType이 DRONE_FRAME 인 경우, MediaFrame._id) */
  sourceFrameId?: string
  /** S3 키 — 분석 대상 이미지 원본 */
  storageKey: string

  // ── AI 탐지 결과 ─────────────────────────────────────────────────────────────
  defectType: CandidateDefectType
  /** 탐지 신뢰도 0.0~1.0 */
  confidence: number
  /** 신뢰도 등급 (AUTO_ACCEPT ≥0.9 | REQUIRES_REVIEW 0.8~0.89 | MANUAL_REQUIRED <0.8) */
  confidenceLevel: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED'
  /** 바운딩 박스 [x, y, width, height] — 이미지 크기 기준 0~1 비율 */
  bbox: [number, number, number, number]
  /** AI 제안 심각도 */
  suggestedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  /** AI 캡션 — KCS 전문용어 기반 자동 생성 */
  aiCaption?: string
  /** KCS 기준 참조 코드 (예: KCS 41 55 02) */
  kcsStandardRef?: string
  /** KCS 허용 기준 초과 여부 */
  kcsExceedsLimit?: boolean
  /** 사용된 AI 모델 버전 (예: mock-v0.1, mask-rcnn-v1.2) */
  modelVersion: string
  /** 탐지 방법 (AiDetectionMethod 열거값 또는 'MOCK') */
  detectionMethod: string

  // ── Human-in-the-loop 검토 ────────────────────────────────────────────────────
  reviewStatus: CandidateReviewStatus
  reviewedBy?: string     // userId
  reviewedAt?: string     // ISO 8601
  reviewNote?: string

  // ── Defect 승격 ──────────────────────────────────────────────────────────────
  /** 승격된 Defect._id (PROMOTED 상태인 경우 설정) */
  promotedDefectId?: string

  // ── Job 연결 ─────────────────────────────────────────────────────────────────
  detectionJobId: string  // Job._id

  createdAt: string
  updatedAt: string
}

// ── DTO ────────────────────────────────────────────────────────────────────────

export interface ReviewDefectCandidateInput {
  reviewStatus: 'APPROVED' | 'REJECTED'
  reviewNote?: string
}

export interface PromoteDefectCandidateInput {
  /** 검토자가 최종 확정한 결함 유형 (미입력 시 AI 탐지값 사용) */
  defectType?: string
  /** 최종 심각도 (미입력 시 AI 제안값 사용) */
  severity?: string
  /** 설명 */
  description?: string
  /** 위치 설명 */
  locationDescription?: string
  /** 연결할 InspectionSession ID */
  sessionId?: string
  /** 연결할 Project ID */
  projectId?: string
}

export interface DefectCandidateQueryOptions {
  complexId?: string
  buildingId?: string
  sourceType?: CandidateSourceType
  sourceMissionId?: string
  defectType?: CandidateDefectType
  reviewStatus?: CandidateReviewStatus
  confidenceLevel?: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED'
  page?: number
  limit?: number
}

// ── 내부 배치 생성 DTO (워커 → API) ────────────────────────────────────────────

export interface BatchCreateCandidatesInput {
  jobDocId: string
  orgId: string
  complexId: string
  buildingId?: string
  sourceType: CandidateSourceType
  sourceMediaId: string
  sourceMissionId?: string
  sourceFrameId?: string
  storageKey: string
  detections: {
    defectType: CandidateDefectType
    confidence: number
    bbox: [number, number, number, number]
    suggestedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    aiCaption?: string
    kcsStandardRef?: string
    kcsExceedsLimit?: boolean
  }[]
  modelVersion: string
  detectionMethod: string
}
