// apps/ai-worker/src/adapters/vision-inference.adapter.ts
// Vision 추론 어댑터 인터페이스 — 실제 모델 교체 가능한 추상 계층

/**
 * VisionInferenceAdapter 인터페이스
 *
 * 구현체 종류:
 *  - MockVisionInferenceAdapter  → 개발/테스트용 stub
 *  - MaskRcnnAdapter             → 실제 Mask R-CNN (Python gRPC 서버 또는 ONNX Runtime)
 *  - YMaskNetAdapter             → Y-MaskNet 드론 비전 AI
 *
 * 어댑터 교체 방법:
 *   worker.module.ts의 providers에서 아래 토큰을 원하는 구현체로 교체합니다.
 *   { provide: VISION_INFERENCE_ADAPTER, useClass: MaskRcnnAdapter }
 */

export const VISION_INFERENCE_ADAPTER = 'VISION_INFERENCE_ADAPTER'

export interface VisionCandidateResult {
  defectType: string
  confidence: number
  confidenceLevel: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED'
  bbox: [number, number, number, number]
  suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  aiCaption?: string
  kcsStandardRef?: string
  kcsExceedsLimit?: boolean
}

export interface VisionInferenceResult {
  candidates: VisionCandidateResult[]
  modelVersion: string
  processedAt: string
  inferenceTimeMs: number
}

export interface VisionInferenceInput {
  /** S3/MinIO 스토리지 키 */
  storageKey: string
  /** 신뢰도 임계값 0~1 */
  confidenceThreshold: number
  /** 최대 탐지 수 */
  maxDetections: number
  /** 요청 모델 */
  model: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK'
}

export interface VisionInferenceAdapter {
  /**
   * 이미지에서 결함 후보를 탐지합니다.
   * @param input 추론 입력 파라미터
   * @returns 탐지된 결함 후보 목록과 메타데이터
   */
  detect(input: VisionInferenceInput): Promise<VisionInferenceResult>
}
