// packages/shared/src/domain/complaint-triage.ts
// 민원 AI 자동 분류(Triage) 도메인 — Phase 2 여섯 번째 기능
// 설계 원칙:
//   - AI는 추천까지만 수행, 최종 확정은 담당자(human-in-the-loop)
//   - AI 미응답 시 rule-based fallback 자동 적용
//   - 기존 Complaint 상태 머신은 변경하지 않음

// ── 열거형 ──────────────────────────────────────────────────────────────────

/** 민원 트리아지 처리 상태 */
export enum ComplaintTriageStatus {
  PENDING    = 'PENDING',     // 트리거 전 (아직 미처리)
  PROCESSING = 'PROCESSING',  // AI 분석 중
  COMPLETED  = 'COMPLETED',   // 분류 완료 (AI 또는 rule-based)
  FAILED     = 'FAILED',      // 처리 오류 (AI + fallback 모두 실패)
}

/** 담당자의 검토 결정 상태 (Human-in-the-loop) */
export enum TriageDecisionStatus {
  PENDING_REVIEW = 'PENDING_REVIEW', // 관리자 검토 대기
  ACCEPTED       = 'ACCEPTED',       // AI 결과 그대로 수락
  MODIFIED       = 'MODIFIED',       // AI 결과를 수정하여 확정
  REJECTED       = 'REJECTED',       // 전체 기각 (수동 재분류 필요)
}

/** 추천 라우팅 대상 유형 */
export enum RoutingSuggestionType {
  USER = 'USER', // 특정 담당자 userId
  TEAM = 'TEAM', // 작업팀 또는 부서명
}

// ── 하위 구조 ────────────────────────────────────────────────────────────────

/** AI가 제안하는 담당자/팀 라우팅 추천 */
export interface RoutingSuggestion {
  /** 추천 대상 유형 */
  type: RoutingSuggestionType
  /** 대상 식별자 (userId 또는 팀 코드) */
  targetId: string
  /** 표시 이름 */
  targetName: string
  /** 추천 근거 요약 */
  reason: string
  /** 추천 신뢰도 0~1 */
  confidence: number
}

/** 담당자 검토 이력 */
export interface TriageReviewRecord {
  /** 이전 결정 상태 */
  previousDecision: TriageDecisionStatus
  /** 변경 후 결정 상태 */
  newDecision: TriageDecisionStatus
  /** 수정된 카테고리 (변경 시) */
  modifiedCategory?: string
  /** 수정된 우선순위 (변경 시) */
  modifiedPriority?: string
  /** 확정 배정 담당자 (변경 시) */
  modifiedAssigneeId?: string
  reviewedBy: string
  reviewedAt: string
  note?: string
}

// ── 도메인 문서 ──────────────────────────────────────────────────────────────

/**
 * ComplaintTriage — 민원 1건에 대한 AI 분류 결과 문서
 * _id 패턴: complaintTriage:{orgId}:{uuid8}
 *
 * - PENDING_REVIEW 상태에서는 Complaint.status를 TRIAGED로 전이하지 않음
 * - ACCEPTED 또는 MODIFIED 확정 후에 Complaint를 TRIAGED로 전이
 * - 자동 배정 금지: acceptedAssigneeId가 확정돼도 Complaint.assignedTo는
 *   별도 API 호출로 업데이트해야 함
 */
export interface ComplaintTriage {
  _id: string
  _rev?: string
  docType: 'complaintTriage'

  orgId: string
  complexId: string
  /** 연결된 Complaint._id */
  complaintId: string

  // ── AI 분류 결과 ─────────────────────────────────────────────────────────
  /** 분류된 민원 카테고리 (ComplaintCategory value) */
  aiCategory?: string
  /** 심각도 등급 (SeverityLevel value) */
  aiSeverity?: string
  /** 긴급도 점수 0~100 (높을수록 즉시 처리 필요) */
  urgencyScore: number
  /** 권장 우선순위 */
  suggestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  /** 권장 SLA (예: "24h", "48h", "72h", "7d") */
  suggestedSla?: string
  /** 담당자/팀 라우팅 추천 목록 (신뢰도 내림차순) */
  routingSuggestions: RoutingSuggestion[]
  /** 분류 근거 텍스트 */
  classificationReason?: string
  /** 탐지된 키워드 목록 */
  keywordMatches?: string[]
  /** 민원에 이미지 포함 여부 */
  hasImage: boolean

  // ── AI 모델 정보 ─────────────────────────────────────────────────────────
  model: string
  modelVersion: string
  promptVersion: string
  /** AI 종합 신뢰도 0~1 */
  confidence: number
  /** true = AI 실패 후 rule-based fallback으로 생성된 결과 */
  isRuleBased: boolean
  processingTimeMs?: number

  // ── 처리 상태 ────────────────────────────────────────────────────────────
  status: ComplaintTriageStatus
  decisionStatus: TriageDecisionStatus
  failureReason?: string

  // ── Human-in-the-loop 검토 결과 ──────────────────────────────────────────
  /** 담당자가 최종 확정한 카테고리 (MODIFIED 시 필수) */
  acceptedCategory?: string
  /** 담당자가 최종 확정한 우선순위 (MODIFIED 시 필수) */
  acceptedPriority?: string
  /** 담당자가 최종 배정한 userId */
  acceptedAssigneeId?: string
  /** 검토 메모 */
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  /** 검토 이력 */
  reviewHistory?: TriageReviewRecord[]

  // ── 연결 ─────────────────────────────────────────────────────────────────
  /** 분석 Job._id */
  triageJobId?: string

  createdAt: string
  updatedAt: string
  createdBy: string
}

// ── 입력 DTO ────────────────────────────────────────────────────────────────

export interface TriggerComplaintTriageInput {
  /** 분류 대상 민원 ID */
  complaintId: string
  complexId: string
  /** 사용할 모델 (기본: MOCK) */
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
}

/** 담당자 검토 DTO — human-in-the-loop 확정 */
export interface ReviewTriageInput {
  /** 검토 결정 */
  decision: 'ACCEPT' | 'MODIFY' | 'REJECT'
  /** MODIFY 시: 확정 카테고리 */
  acceptedCategory?: string
  /** MODIFY 시: 확정 우선순위 */
  acceptedPriority?: string
  /** ACCEPT/MODIFY 시: 최종 배정 담당자 userId */
  acceptedAssigneeId?: string
  /** 검토 메모 */
  reviewNote?: string
}

export interface ComplaintTriageQueryOptions {
  complexId?: string
  complaintId?: string
  status?: ComplaintTriageStatus
  decisionStatus?: TriageDecisionStatus
  page?: number
  limit?: number
}

// ── 워커 내부 저장 DTO ────────────────────────────────────────────────────────

export interface SaveComplaintTriageResultInput {
  triageId: string
  orgId: string
  status: ComplaintTriageStatus
  aiCategory?: string
  aiSeverity?: string
  urgencyScore: number
  suggestedPriority?: string
  suggestedSla?: string
  routingSuggestions: RoutingSuggestion[]
  classificationReason?: string
  keywordMatches?: string[]
  confidence: number
  isRuleBased: boolean
  model: string
  modelVersion: string
  promptVersion: string
  processingTimeMs: number
  failureReason?: string
}

// ── 레이블 맵 ────────────────────────────────────────────────────────────────

export const TRIAGE_STATUS_LABELS: Record<ComplaintTriageStatus, string> = {
  [ComplaintTriageStatus.PENDING]:    '대기',
  [ComplaintTriageStatus.PROCESSING]: '분석중',
  [ComplaintTriageStatus.COMPLETED]:  '완료',
  [ComplaintTriageStatus.FAILED]:     '실패',
}

export const TRIAGE_DECISION_LABELS: Record<TriageDecisionStatus, string> = {
  [TriageDecisionStatus.PENDING_REVIEW]: '검토대기',
  [TriageDecisionStatus.ACCEPTED]:       '수락',
  [TriageDecisionStatus.MODIFIED]:       '수정확정',
  [TriageDecisionStatus.REJECTED]:       '기각',
}

/** 카테고리별 기본 SLA */
export const CATEGORY_DEFAULT_SLA: Record<string, string> = {
  SAFETY:    '24h',   // 안전: 24시간
  ELEVATOR:  '24h',   // 엘리베이터: 24시간
  FACILITY:  '72h',   // 시설물: 72시간
  LEAK:      '48h',   // 누수: 48시간
  NOISE:     '72h',   // 소음: 72시간
  SANITATION:'48h',   // 위생: 48시간
  PARKING:   '7d',    // 주차: 7일
  OTHER:     '7d',    // 기타: 7일
}
