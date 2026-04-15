// packages/shared/src/domain/crack-analysis-result.ts
// 균열 분석 결과 도메인 — CrackMeasurement와 분리된 별도 analysis layer
// Phase 1 CrackMeasurement를 수정하지 않고 별도 문서로 심층 분석 결과를 보강한다.

import {
  CrackRoi, CrackCalibrationParams, CrackCvAnalysisRaw,
  CrackConfidenceBreakdown, CrackManualCorrection,
} from '../cv/crack-analysis-types'

// ── 상태 열거형 ────────────────────────────────────────────────────────────────

export enum CrackAnalysisStatus {
  PENDING    = 'PENDING',     // Job 생성, 분석 대기
  RUNNING    = 'RUNNING',     // 분석 진행 중
  COMPLETED  = 'COMPLETED',   // 분석 완료
  FAILED     = 'FAILED',      // 분석 실패 (수동 보정 필요)
  OVERRIDDEN = 'OVERRIDDEN',  // 수동 보정값으로 덮어씀
}

export enum CrackAnalysisReviewStatus {
  PENDING   = 'PENDING',    // 검토 대기
  ACCEPTED  = 'ACCEPTED',   // 분석 결과 수용
  CORRECTED = 'CORRECTED',  // 수동 보정 완료
  REJECTED  = 'REJECTED',   // 분석 결과 기각 (측정 재수행 필요)
}

// ── 도메인 문서 ────────────────────────────────────────────────────────────────

/**
 * CrackAnalysisResult — 이미지 기반 균열 심층 분석 결과
 * _id 패턴: crackAnalysis:{orgId}:{uuid8}
 *
 * - Phase 1 CrackMeasurement를 대체하지 않고 보강 (measurementId로 연결)
 * - 분석 실패 시 manualCorrection으로 폴백
 * - 최종 확정값: finalWidthMm / finalLengthMm
 */
export interface CrackAnalysisResult {
  _id: string
  _rev?: string
  docType: 'crackAnalysis'

  orgId: string
  complexId: string
  gaugePointId: string
  /** 연결된 CrackMeasurement._id (측정 후 분석인 경우 설정) */
  measurementId?: string

  // ── 이미지 소스 ──────────────────────────────────────────────────────────────
  /** 원본 이미지 S3 키 */
  capturedImageKey: string
  /** ROI 추출 이미지 S3 키 */
  roiImageKey?: string
  /** 분석 오버레이 이미지 S3 키 (균열 윤곽 + 측정선 합성) */
  overlayImageKey?: string

  // ── 분석 파라미터 ─────────────────────────────────────────────────────────────
  /** 분석에 사용된 ROI (정규화 0~1) */
  roi?: CrackRoi
  /** 캘리브레이션 파라미터 */
  calibration: CrackCalibrationParams

  // ── CV 분석 결과 ─────────────────────────────────────────────────────────────
  /** 자동 분석 원시 결과 (분석 성공 시) */
  analysis?: CrackCvAnalysisRaw

  // ── 신뢰도 ──────────────────────────────────────────────────────────────────
  /** 종합 신뢰도 0~1 */
  confidence: number
  /** 신뢰도 세부 분해 */
  confidenceBreakdown?: CrackConfidenceBreakdown

  // ── 처리 상태 ────────────────────────────────────────────────────────────────
  analysisStatus: CrackAnalysisStatus
  failureReason?: string
  /** 처리 소요 시간 (ms) */
  processingTimeMs?: number

  // ── 검토 ────────────────────────────────────────────────────────────────────
  reviewStatus: CrackAnalysisReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string

  // ── 수동 보정값 ──────────────────────────────────────────────────────────────
  /** 점검자가 입력한 수동 보정값 (분석 실패 또는 낮은 신뢰도 시) */
  manualCorrection?: CrackManualCorrection

  // ── 최종 확정값 ──────────────────────────────────────────────────────────────
  /** 최종 확정 균열 폭 (mm) — analysis 또는 manualCorrection 중 선택 */
  finalWidthMm: number
  /** 최종 확정 균열 길이 (mm) */
  finalLengthMm?: number

  // ── 모델 정보 ────────────────────────────────────────────────────────────────
  modelVersion: string

  // ── Job 연결 ─────────────────────────────────────────────────────────────────
  analysisJobId?: string

  createdAt: string
  updatedAt: string
}

// ── DTO ────────────────────────────────────────────────────────────────────────

export interface CreateCrackAnalysisInput {
  gaugePointId: string
  complexId: string
  capturedImageKey: string
  measurementId?: string
  roi?: CrackRoi
  mmPerGraduation: number
  manualPxPerMm?: number
  model?: 'OPENCV_WASM' | 'MOCK'
}

export interface ManualCorrectionInput {
  correctedWidthMm: number
  correctedLengthMm?: number
  correctionNote?: string
}

export interface ReviewCrackAnalysisInput {
  reviewStatus: 'ACCEPTED' | 'CORRECTED' | 'REJECTED'
  reviewNote?: string
  manualCorrection?: ManualCorrectionInput
}

export interface CrackAnalysisQueryOptions {
  gaugePointId?: string
  complexId?: string
  measurementId?: string
  analysisStatus?: CrackAnalysisStatus
  reviewStatus?: CrackAnalysisReviewStatus
  page?: number
  limit?: number
}

// ── 내부 결과 저장 DTO (워커 → API) ──────────────────────────────────────────

export interface SaveCrackAnalysisResultInput {
  analysisId: string
  orgId: string
  analysisStatus: CrackAnalysisStatus
  confidence: number
  confidenceBreakdown?: CrackConfidenceBreakdown
  calibration: CrackCalibrationParams
  analysis?: CrackCvAnalysisRaw
  finalWidthMm: number
  finalLengthMm?: number
  modelVersion: string
  processingTimeMs: number
  failureReason?: string
  roiImageKey?: string
  overlayImageKey?: string
}
