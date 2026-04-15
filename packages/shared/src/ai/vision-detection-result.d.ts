import { CandidateDefectType } from '../domain/defect-candidate';
export interface VisionCandidate {
    /** 결함 유형 */
    defectType: CandidateDefectType;
    /** 신뢰도 0.0~1.0 */
    confidence: number;
    /** 신뢰도 등급 */
    confidenceLevel: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED';
    /** 바운딩 박스 [x, y, width, height] — 이미지 크기 대비 0~1 비율 */
    bbox: [number, number, number, number];
    /** 제안 심각도 */
    suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    /** AI 캡션 (KCS 전문용어 기반) */
    aiCaption?: string;
    /** KCS 기준 참조 코드 */
    kcsStandardRef?: string;
    /** KCS 허용 기준 초과 여부 */
    kcsExceedsLimit?: boolean;
    /** 픽셀 수준 세그멘테이션 마스크 (Mask R-CNN / Y-MaskNet, 선택적) */
    segmentMask?: number[][];
}
export interface VisionDetectionResult {
    /** 탐지된 후보 목록 */
    candidates: VisionCandidate[];
    /** 사용된 모델 버전 */
    modelVersion: string;
    /** 추론 완료 시각 (ISO 8601) */
    processedAt: string;
    /** 추론 소요 시간 (ms) */
    inferenceTimeMs?: number;
    /** 이미지 해상도 */
    imageWidth?: number;
    imageHeight?: number;
}
export interface VisionInferenceOptions {
    /** S3/MinIO 스토리지 키 */
    storageKey: string;
    /** 신뢰도 임계값 (기본 0.5) */
    confidenceThreshold: number;
    /** 사용할 모델 */
    model: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK';
    /** 최대 탐지 수 (기본 20) */
    maxDetections?: number;
}
export declare function getConfidenceLevel(confidence: number): 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED';
export declare const KCS_REF_BY_DEFECT_TYPE: Record<string, string>;
export declare const KCS_THRESHOLD_DESCRIPTION: Record<string, string>;
