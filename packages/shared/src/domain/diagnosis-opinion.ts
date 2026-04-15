// packages/shared/src/domain/diagnosis-opinion.ts
// AI 진단 의견 도메인 — 결함/점검세션/게이지포인트를 종합한 AI 초안 의견
// Phase 1 보고서 구조를 깨지 않고 확장 레이어로 추가

// ── 열거형 ─────────────────────────────────────────────────────────────────────

/** 진단 의견 처리 상태 */
export enum DiagnosisOpinionStatus {
  DRAFT     = 'DRAFT',      // AI 초안 생성 완료, 검토 대기
  REVIEWING = 'REVIEWING',  // 검토자가 검토 중
  APPROVED  = 'APPROVED',   // 승인 완료 — 공식 보고서 반영 가능
  REJECTED  = 'REJECTED',   // 기각 — 재생성 필요
}

/** 진단 긴급도 */
export enum DiagnosisUrgency {
  IMMEDIATE = 'IMMEDIATE',       // 즉시 조치 (위험, 안전사고 우려)
  URGENT    = 'URGENT',          // 긴급 (1주 이내)
  ROUTINE   = 'ROUTINE',         // 일반 (1개월 이내)
  PLANNED   = 'PLANNED',         // 계획 정비 (분기·연간)
}

/** 진단 대상 유형 */
export enum DiagnosisTargetType {
  DEFECT             = 'DEFECT',             // 단일 결함
  INSPECTION_SESSION = 'INSPECTION_SESSION', // 점검 세션 전체
  GAUGE_POINT        = 'GAUGE_POINT',        // 균열 게이지 포인트
  COMPLEX            = 'COMPLEX',            // 단지 전체 종합
}

// ── 하위 구조 ──────────────────────────────────────────────────────────────────

/** AI 가 분석에 사용한 컨텍스트 요약 */
export interface DiagnosisContextSummary {
  /** 분석에 포함된 결함 수 */
  defectCount: number
  /** 분석에 포함된 균열 측정 수 */
  crackMeasurementCount: number
  /** 분석에 포함된 민원 수 */
  complaintCount: number
  /** 분석에 포함된 경보 수 */
  alertCount: number
  /** 가장 심각한 결함 유형 */
  highestSeverity?: string
  /** 분석 기간 시작 */
  periodFrom?: string
  /** 분석 기간 종료 */
  periodTo?: string
}

/** 검토자의 수정 이력 */
export interface DiagnosisEditRecord {
  /** 수정한 필드 */
  field: 'summary' | 'technicalOpinionDraft' | 'urgency' | 'estimatedPriorityScore'
  /** 수정 전 값 */
  previousValue: string
  /** 수정 후 값 */
  newValue: string
  /** 수정자 userId */
  editedBy: string
  editedAt: string
}

// ── 도메인 문서 ────────────────────────────────────────────────────────────────

/**
 * DiagnosisOpinion — AI 생성 진단 의견 초안
 * _id 패턴: diagnosisOpinion:{orgId}:{uuid8}
 *
 * - DRAFT 상태에서는 공식 문서 반영 금지
 * - APPROVED 전까지 보고서에 포함 불가
 * - 검토자가 내용 수정 가능 (edit history 기록)
 */
export interface DiagnosisOpinion {
  _id: string
  _rev?: string
  docType: 'diagnosisOpinion'

  orgId: string
  complexId: string

  // ── 진단 대상 ──────────────────────────────────────────────────────────────
  targetType: DiagnosisTargetType
  /** 주 대상 문서 ID (defect._id / sessionId / gaugePointId / complexId) */
  targetId: string
  /** 점검 세션 ID (선택) */
  sessionId?: string
  /** 분석 대상 결함 ID 목록 */
  defectIds?: string[]
  /** 분석에 사용된 컨텍스트 요약 */
  contextSummary?: DiagnosisContextSummary

  // ── AI 생성 내용 ───────────────────────────────────────────────────────────
  /** 한 줄 요약 */
  summary: string
  /** 기술 의견 초안 (마크다운 가능) */
  technicalOpinionDraft: string
  /** 긴급도 */
  urgency: DiagnosisUrgency
  /** 우선순위 점수 0~100 (높을수록 우선) */
  estimatedPriorityScore: number
  /** AI 종합 신뢰도 0~1 */
  confidence: number

  // ── 모델 정보 ──────────────────────────────────────────────────────────────
  /** 사용된 LLM/모델 식별자 */
  model: string
  modelVersion: string
  /** 프롬프트 버전 */
  promptVersion: string
  /** 사용 토큰 수 (선택) */
  tokensUsed?: number

  // ── 처리 상태 ──────────────────────────────────────────────────────────────
  status: DiagnosisOpinionStatus
  /** 처리 소요 시간 (ms) */
  processingTimeMs?: number
  failureReason?: string

  // ── 검토 ──────────────────────────────────────────────────────────────────
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  /** 검토 중 수정 이력 */
  editHistory?: DiagnosisEditRecord[]

  // ── 연결 ──────────────────────────────────────────────────────────────────
  /** 생성에 사용된 AsyncJob._id */
  diagnosisJobId?: string
  /** 연결된 RepairRecommendation ID 목록 (생성 후 채워짐) */
  recommendationIds?: string[]

  createdAt: string
  updatedAt: string
  createdBy: string
}

// ── DTO ────────────────────────────────────────────────────────────────────────

export interface TriggerDiagnosisOpinionInput {
  targetType: DiagnosisTargetType
  targetId: string
  complexId: string
  sessionId?: string
  defectIds?: string[]
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
  language?: 'ko' | 'en'
}

export interface UpdateDiagnosisOpinionInput {
  summary?: string
  technicalOpinionDraft?: string
  urgency?: DiagnosisUrgency
  estimatedPriorityScore?: number
}

export interface ReviewDiagnosisOpinionInput {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  reviewNote?: string
  /** 승인 전 최종 수정 (선택) */
  finalEdits?: UpdateDiagnosisOpinionInput
}

export interface DiagnosisOpinionQueryOptions {
  complexId?: string
  targetType?: DiagnosisTargetType
  targetId?: string
  sessionId?: string
  status?: DiagnosisOpinionStatus
  urgency?: DiagnosisUrgency
  page?: number
  limit?: number
}

// ── 워커 내부 저장 DTO ────────────────────────────────────────────────────────

export interface SaveDiagnosisOpinionResultInput {
  diagnosisId: string
  orgId: string
  status: DiagnosisOpinionStatus
  summary: string
  technicalOpinionDraft: string
  urgency: DiagnosisUrgency
  estimatedPriorityScore: number
  confidence: number
  model: string
  modelVersion: string
  promptVersion: string
  tokensUsed?: number
  processingTimeMs: number
  failureReason?: string
  contextSummary?: DiagnosisContextSummary
  /** 워커가 생성한 보수 추천 초안 목록 (API가 별도 저장) */
  recommendationDrafts?: RepairRecommendationDraft[]
}

export interface RepairRecommendationDraft {
  recommendedAction: string
  actionDetail?: string
  recommendedTimeline: string
  priorityRank: number
  kcsStandardRef?: string
  kcsComplianceNote?: string
  estimatedCostRange?: { min: number; max: number; currency: 'KRW' }
}
