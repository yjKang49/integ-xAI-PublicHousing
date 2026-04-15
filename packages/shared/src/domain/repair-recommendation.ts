// packages/shared/src/domain/repair-recommendation.ts
// 보수·보강 추천 도메인 — DiagnosisOpinion에서 파생된 단위 조치 추천
// 승인된 항목만 PDF 보고서에 포함 가능

// ── 열거형 ─────────────────────────────────────────────────────────────────────

/** 추천 조치 시행 기한 */
export enum RepairTimeline {
  IMMEDIATE       = 'IMMEDIATE',         // 즉시 (24h 이내)
  WITHIN_1_WEEK   = 'WITHIN_1_WEEK',     // 1주 이내
  WITHIN_1_MONTH  = 'WITHIN_1_MONTH',    // 1개월 이내
  WITHIN_3_MONTHS = 'WITHIN_3_MONTHS',   // 3개월 이내 (분기)
  ANNUAL_PLAN     = 'ANNUAL_PLAN',       // 연간 정기 계획에 포함
}

// ── 도메인 문서 ────────────────────────────────────────────────────────────────

/**
 * RepairRecommendation — AI 생성 보수·보강 단위 추천
 * _id 패턴: repairRec:{orgId}:{uuid8}
 *
 * - DiagnosisOpinion.APPROVED 상태에서만 최종 승인 가능
 * - isApproved=true + diagnosisOpinion.status=APPROVED 조합만 보고서 반영
 */
export interface RepairRecommendation {
  _id: string
  _rev?: string
  docType: 'repairRecommendation'

  orgId: string
  complexId: string

  // ── 연결 ──────────────────────────────────────────────────────────────────
  /** 생성 근거 DiagnosisOpinion._id */
  diagnosisOpinionId: string
  /** 관련 결함 ID (선택) */
  defectId?: string
  /** 관련 게이지 포인트 ID (선택) */
  gaugePointId?: string
  /** 관련 자산 ID (선택) */
  assetId?: string

  // ── 추천 내용 ──────────────────────────────────────────────────────────────
  /** 추천 보수 공법·조치 (단문) */
  recommendedAction: string
  /** 조치 상세 설명 */
  actionDetail?: string
  /** 시행 기한 */
  recommendedTimeline: RepairTimeline
  /** 우선순위 순위 (1 = 최우선) */
  priorityRank: number
  /** 예상 공사 비용 범위 */
  estimatedCostRange?: {
    min: number
    max: number
    currency: 'KRW'
  }

  // ── KCS 기준 연동 ──────────────────────────────────────────────────────────
  /** KCS 참조 코드 (예: KCS 41 55 02) */
  kcsStandardRef?: string
  /** KCS 기준 준수 메모 */
  kcsComplianceNote?: string

  // ── 승인 상태 ──────────────────────────────────────────────────────────────
  /** 검토자 승인 여부 */
  isApproved: boolean
  approvedBy?: string
  approvedAt?: string
  approvalNote?: string

  // ── 보고서 연동 ────────────────────────────────────────────────────────────
  /** 이미 포함된 보고서 ID */
  includedInReportId?: string
  /** 보고서 섹션 번호 (정렬용) */
  reportSectionOrder?: number

  createdAt: string
  updatedAt: string
}

// ── DTO ────────────────────────────────────────────────────────────────────────

export interface UpdateRepairRecommendationInput {
  recommendedAction?: string
  actionDetail?: string
  recommendedTimeline?: RepairTimeline
  priorityRank?: number
  estimatedCostRange?: { min: number; max: number; currency: 'KRW' }
  kcsStandardRef?: string
  kcsComplianceNote?: string
}

export interface ApproveRepairRecommendationInput {
  approvalNote?: string
}

export interface RepairRecommendationQueryOptions {
  complexId?: string
  diagnosisOpinionId?: string
  defectId?: string
  isApproved?: boolean
  recommendedTimeline?: RepairTimeline
  page?: number
  limit?: number
}
