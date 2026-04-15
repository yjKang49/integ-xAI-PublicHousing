// apps/ai-worker/src/adapters/crack-analysis.adapter.ts
import { CrackRoi, CrackAnalysisOptions, CrackCvAnalysisRaw, CrackCalibrationParams } from '@ax/shared'

export const CRACK_ANALYSIS_ADAPTER = 'CRACK_ANALYSIS_ADAPTER'

export interface CrackAnalysisInput {
  /** 원본 이미지 S3 키 */
  storageKey: string
  /** 분석 옵션 (ROI, 캘리브레이션, 모델 등) */
  options: CrackAnalysisOptions
}

export interface CrackAnalysisAdapterResult {
  /** CV 분석 원시 결과 */
  analysis: CrackCvAnalysisRaw
  /** 실제 사용된 캘리브레이션 파라미터 */
  calibration: CrackCalibrationParams
  /** 종합 신뢰도 0~1 */
  confidence: number
  /** 신뢰도 세부 분해 */
  confidenceBreakdown: {
    crackDetected: boolean
    graduationsDetected: boolean
    calibrationConfidence: number
    contourQuality: number
    overall: number
  }
  /** ROI 추출 이미지 (base64 PNG, 선택) */
  roiImageBase64?: string
  /** 오버레이 이미지 (base64 PNG, 선택) */
  overlayImageBase64?: string
  /** 모델 버전 */
  modelVersion: string
}

/** CV 균열 분석 어댑터 인터페이스 */
export interface CrackAnalysisAdapter {
  analyze(input: CrackAnalysisInput): Promise<CrackAnalysisAdapterResult>
}
