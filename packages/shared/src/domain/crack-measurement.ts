// packages/shared/src/domain/crack-measurement.ts
// Domain-layer types for CrackMeasurement

export type MeasurementMethod = 'MANUAL' | 'IMAGE_ASSISTED';

export interface CreateCrackMeasurementInput {
  gaugePointId: string;
  complexId: string;
  sessionId?: string;
  /** 측정 일시 (ISO) */
  measuredAt: string;
  /** S3에 업로드된 원본 이미지 키 */
  capturedImageKey: string;
  /** OpenCV ROI 추출 이미지 키 (optional) */
  roiImageKey?: string;
  /** 자동 측정값 (mm) — isManualOverride=true 시 manualWidthMm으로 대체됨 */
  measuredWidthMm: number;
  /** 측정 방식 */
  method: MeasurementMethod;
  /** 수동 입력 여부 (OpenCV 실패 or 낮은 신뢰도) */
  isManualOverride: boolean;
  /** 수동 입력값 (mm) — isManualOverride=true일 때 사용 */
  manualWidthMm?: number;
  /** OpenCV 신뢰도 (0–1) */
  autoConfidence?: number;
  /** 눈금 검출 수 */
  graduationCount?: number;
  /** 눈금 1칸 = N mm (캘리브레이션 값) */
  scaleMmPerGraduation?: number;
  notes?: string;
}

/**
 * 측정 결과 요약 — 이전 측정 대비 변화량 포함
 * (백엔드에서 계산 후 반환)
 */
export interface MeasurementWithDelta extends CreateCrackMeasurementInput {
  _id: string;
  measuredBy: string;
  /** 기준값(baseline) 대비 변화량 (mm) */
  deltaFromPrevious: number;   // ← 요구사항 필드명 (changeFromLastMm alias)
  changeFromBaselineMm: number;
  changeFromLastMm?: number;
  exceedsThreshold: boolean;
}

/**
 * 추세 분석 응답
 */
export interface CrackTrendResponse {
  gaugePointId: string;
  measurements: MeasurementWithDelta[];
  trend: 'STABLE' | 'INCREASING' | 'DECREASING';
  latestWidthMm: number | null;
  /** 조회 기간 (일) */
  days: number;
}
