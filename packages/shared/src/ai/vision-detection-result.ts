// packages/shared/src/ai/vision-detection-result.ts
// AI Vision 추론 결과 타입 — inference adapter 계층의 출력 인터페이스

import { CandidateDefectType } from '../domain/defect-candidate'

// ── 단일 탐지 결과 ─────────────────────────────────────────────────────────────

export interface VisionCandidate {
  /** 결함 유형 */
  defectType: CandidateDefectType
  /** 신뢰도 0.0~1.0 */
  confidence: number
  /** 신뢰도 등급 */
  confidenceLevel: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED'
  /** 바운딩 박스 [x, y, width, height] — 이미지 크기 대비 0~1 비율 */
  bbox: [number, number, number, number]
  /** 제안 심각도 */
  suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  /** AI 캡션 (KCS 전문용어 기반) */
  aiCaption?: string
  /** KCS 기준 참조 코드 */
  kcsStandardRef?: string
  /** KCS 허용 기준 초과 여부 */
  kcsExceedsLimit?: boolean
  /** 픽셀 수준 세그멘테이션 마스크 (Mask R-CNN / Y-MaskNet, 선택적) */
  segmentMask?: number[][]
}

// ── 추론 결과 전체 ─────────────────────────────────────────────────────────────

export interface VisionDetectionResult {
  /** 탐지된 후보 목록 */
  candidates: VisionCandidate[]
  /** 사용된 모델 버전 */
  modelVersion: string
  /** 추론 완료 시각 (ISO 8601) */
  processedAt: string
  /** 추론 소요 시간 (ms) */
  inferenceTimeMs?: number
  /** 이미지 해상도 */
  imageWidth?: number
  imageHeight?: number
}

// ── Adapter 입력 옵션 ──────────────────────────────────────────────────────────

export interface VisionInferenceOptions {
  /** S3/MinIO 스토리지 키 */
  storageKey: string
  /** 신뢰도 임계값 (기본 0.5) */
  confidenceThreshold: number
  /** 사용할 모델 */
  model: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK'
  /** 최대 탐지 수 (기본 20) */
  maxDetections?: number
}

// ── 신뢰도 등급 헬퍼 ──────────────────────────────────────────────────────────

export function getConfidenceLevel(
  confidence: number,
): 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED' {
  if (confidence >= 0.9) return 'AUTO_ACCEPT'
  if (confidence >= 0.8) return 'REQUIRES_REVIEW'
  return 'MANUAL_REQUIRED'
}

// ── KCS 참조 매핑 ──────────────────────────────────────────────────────────────

export const KCS_REF_BY_DEFECT_TYPE: Record<string, string> = {
  CRACK:              'KCS 41 55 02',
  LEAK:               'KCS 41 40 06',
  DELAMINATION:       'KCS 41 55 02',
  SPOILING:           'KCS 41 55 03',
  CORROSION:          'KCS 14 20 22',
  EFFLORESCENCE:      'KCS 41 55 04',
  FIRE_RISK_CLADDING: 'KCS 41 55 08',
  OTHER:              '',
}

// ── 결함 유형별 KCS 임계치 기준 ────────────────────────────────────────────────

export const KCS_THRESHOLD_DESCRIPTION: Record<string, string> = {
  CRACK:              '균열폭 0.3mm 초과 시 보수 필요 (KCS 41 55 02)',
  LEAK:               '외벽 누수 발생 시 즉시 조치 (KCS 41 40 06)',
  DELAMINATION:       '박리 면적 0.5㎡ 초과 시 긴급 보수 (KCS 41 55 02)',
  SPOILING:           '오손 면적 1㎡ 초과 시 미관 보수 (KCS 41 55 03)',
  CORROSION:          '철근 노출 또는 단면 손실 발생 즉시 조치 (KCS 14 20 22)',
  EFFLORESCENCE:      '반복 발생 시 누수 경로 점검 필요 (KCS 41 55 04)',
  FIRE_RISK_CLADDING: '화재위험 외장재 확인 즉시 위험관리 프로세스 가동 (KCS 41 55 08)',
  OTHER:              '기타 결함 — 전문가 현장 확인 필요',
}
