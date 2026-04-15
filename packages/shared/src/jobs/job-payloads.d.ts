import { JobType } from './job-types';
export interface AiImageAnalysisPayload {
    jobType: JobType.AI_IMAGE_ANALYSIS;
    /** CouchDB 미디어 문서 ID */
    mediaId: string;
    /** 결함 문서 ID (결과 저장 대상) */
    defectId?: string;
    /** 단지 ID */
    complexId: string;
    /** 이미지 저장소 키 (S3/MinIO 경로) */
    storageKey: string;
    /** 사용할 AI 모델 */
    model?: 'MASK_RCNN' | 'Y_MASKNET';
    /** 신뢰도 임계값 (0~1, 기본 0.8) */
    confidenceThreshold?: number;
}
export interface DroneVideoAnalysisPayload {
    jobType: JobType.DRONE_VIDEO_ANALYSIS;
    /** 드론 미디어 문서 ID */
    mediaId: string;
    /** 단지 ID */
    complexId: string;
    /** 동 ID (선택) */
    buildingId?: string;
    /** 영상 저장소 키 */
    storageKey: string;
    /** 분석 시작 오프셋 초 (기본 0) */
    startOffsetSec?: number;
    /** 키프레임 추출 간격 초 (기본 5) */
    keyframeIntervalSec?: number;
}
export interface CrackWidthMeasurementPayload {
    jobType: JobType.CRACK_WIDTH_MEASUREMENT;
    /** 균열 게이지 포인트 ID */
    gaugePointId: string;
    /** 미디어 ID */
    mediaId: string;
    /** 단지 ID */
    complexId: string;
    /** 이미지 저장소 키 */
    storageKey: string;
    /** 기준선 폭 mm (이전 측정값, 변화량 계산용) */
    baselineWidthMm?: number;
    /** 픽셀→mm 환산 비율 (캘리브레이션 값) */
    pixelToMmRatio?: number;
}
export interface ReportGenerationPayload {
    jobType: JobType.REPORT_GENERATION;
    /** 보고서 유형 */
    reportType: string;
    /** 단지 ID */
    complexId: string;
    /** 점검 세션 ID (선택) */
    sessionId?: string;
    /** 보고서 기간 시작일 (ISO 8601) */
    periodFrom?: string;
    /** 보고서 기간 종료일 (ISO 8601) */
    periodTo?: string;
    /** 출력 포맷 */
    format?: 'PDF' | 'EXCEL' | 'HTML';
    /** 추가 옵션 */
    options?: Record<string, any>;
}
export interface RpaBillGenerationPayload {
    jobType: JobType.RPA_BILL_GENERATION;
    /** 단지 ID */
    complexId: string;
    /** 청구 연월 (YYYY-MM) */
    billingMonth: string;
    /** 드라이런 모드 (실제 발송 없음) */
    dryRun?: boolean;
}
export interface RpaContractExpiryPayload {
    jobType: JobType.RPA_CONTRACT_EXPIRY;
    /** 만료 임박 기준 일수 (기본 30) */
    daysBeforeExpiry?: number;
    /** 알림 채널 */
    channels?: Array<'EMAIL' | 'SMS' | 'PUSH'>;
    /** 드라이런 모드 */
    dryRun?: boolean;
}
export interface RpaComplaintIntakePayload {
    jobType: JobType.RPA_COMPLAINT_INTAKE;
    /** 민원 문서 ID */
    complaintId: string;
    /** 단지 ID */
    complexId: string;
    /** AI 자동 분류 활성화 */
    enableAiClassification?: boolean;
}
export interface ScheduleAutoGeneratePayload {
    jobType: JobType.SCHEDULE_AUTO_GENERATE;
    /** 단지 ID */
    complexId: string;
    /** 일정 유형 */
    scheduleType?: 'REGULAR_INSPECTION' | 'PREVENTIVE_MAINTENANCE' | 'SAFETY_CHECK';
    /** 생성 대상 월 (YYYY-MM, 생략 시 익월) */
    targetMonth?: string;
    /** 건물 ID 목록 (생략 시 단지 전체) */
    buildingIds?: string[];
}
export interface VideoFrameExtractionPayload {
    jobType: JobType.VIDEO_FRAME_EXTRACTION;
    /** DroneMission 문서 ID */
    missionId: string;
    /** DroneMissionMedia 항목 ID */
    mediaItemId: string;
    /** 단지 ID */
    complexId: string;
    /** 영상 S3 스토리지 키 */
    storageKey: string;
    /** 키프레임 추출 간격 초 (기본 5) */
    keyframeIntervalSec?: number;
    /** 최대 추출 프레임 수 (기본 200) */
    maxFrames?: number;
    /** 추출 품질 (1~31, 낮을수록 고품질, 기본 2) */
    quality?: number;
}
export interface ImageMetadataExtractionPayload {
    jobType: JobType.IMAGE_METADATA_EXTRACTION;
    /** DroneMission 문서 ID */
    missionId: string;
    /** DroneMissionMedia 항목 ID */
    mediaItemId: string;
    /** 단지 ID */
    complexId: string;
    /** 이미지 S3 스토리지 키 */
    storageKey: string;
}
export interface DefectDetectionPayload {
    jobType: JobType.DEFECT_DETECTION;
    /** 단지 ID */
    complexId: string;
    /** 동 ID (선택) */
    buildingId?: string;
    /** 탐지 소스 유형 */
    sourceType: 'DRONE_FRAME' | 'DRONE_IMAGE' | 'MOBILE_PHOTO' | 'MANUAL';
    /** 소스 미디어 식별자 */
    sourceMediaId: string;
    /** 드론 미션 ID (선택) */
    sourceMissionId?: string;
    /** 드론 프레임 _id (선택) */
    sourceFrameId?: string;
    /** 분석 대상 이미지 S3 키 */
    storageKey: string;
    /** 사용할 AI 모델 (기본: MOCK) */
    model?: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK';
    /** 신뢰도 임계값 0~1 (기본 0.5) */
    confidenceThreshold?: number;
    /** 최대 탐지 수 (기본 20) */
    maxDetections?: number;
}
export interface CrackAnalysisPayload {
    jobType: JobType.CRACK_ANALYSIS;
    /** 분석 결과 문서 ID (미리 생성, 워커 결과 저장 대상) */
    analysisId: string;
    /** 단지 ID */
    complexId: string;
    /** 균열 게이지 포인트 ID */
    gaugePointId: string;
    /** 연결된 CrackMeasurement._id (선택) */
    measurementId?: string;
    /** 원본 이미지 S3 키 */
    capturedImageKey: string;
    /** 사용할 모델 */
    model?: 'OPENCV_WASM' | 'MOCK';
    /** ROI 정보 (0~1 비율, 선택) */
    roi?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    /** 눈금 1칸 mm (캘리브레이션) */
    mmPerGraduation: number;
    /** 수동 px/mm 비율 (자동 검출 실패 시 폴백) */
    manualPxPerMm?: number;
    /** 세그멘테이션 마스크 추출 여부 */
    extractMask?: boolean;
    /** 골격선 추출 여부 */
    extractSkeleton?: boolean;
    /** 폭 샘플링 수 (기본 5) */
    widthSampleCount?: number;
}
export interface DiagnosisOpinionPayload {
    jobType: JobType.DIAGNOSIS_OPINION;
    /** 미리 생성된 DiagnosisOpinion._id */
    diagnosisId: string;
    /** 단지 ID */
    complexId: string;
    /** 진단 대상 유형 */
    targetType: 'DEFECT' | 'INSPECTION_SESSION' | 'GAUGE_POINT' | 'COMPLEX';
    /** 주 대상 문서 ID */
    targetId: string;
    /** 점검 세션 ID (선택) */
    sessionId?: string;
    /** 컨텍스트에 포함할 결함 ID 목록 */
    defectIds?: string[];
    /** 사용할 모델 (기본: MOCK) */
    model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU';
    /** 출력 언어 */
    language?: 'ko' | 'en';
}
export interface ComplaintTriagePayload {
    jobType: JobType.COMPLAINT_TRIAGE;
    /** 미리 생성된 ComplaintTriage._id */
    triageId: string;
    /** 분류 대상 Complaint._id */
    complaintId: string;
    /** 단지 ID */
    complexId: string;
    /** 사용할 모델 (기본: MOCK) */
    model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU';
}
export interface RiskScoreCalculatePayload {
    jobType: JobType.RISK_SCORE_CALCULATE;
    /** 미리 생성된 RiskScore._id */
    riskScoreId: string;
    /** 단지 ID */
    complexId: string;
    /** 계산 대상 유형 */
    targetType: 'ASSET' | 'ZONE' | 'BUILDING' | 'COMPLEX';
    /** 계산 대상 문서 ID */
    targetId: string;
    /** 대상 이름 (UI 표시용) */
    targetName: string;
    /** 계산 완료 후 자동으로 Recommendation 생성 여부 */
    generateRecommendation?: boolean;
}
export interface MaintenanceRecommendPayload {
    jobType: JobType.MAINTENANCE_RECOMMEND;
    /** 미리 생성된 MaintenanceRecommendation._id */
    recommendationId: string;
    /** 기반 RiskScore._id */
    riskScoreId: string;
    /** 단지 ID */
    complexId: string;
    /** 계산 대상 유형 */
    targetType: 'ASSET' | 'ZONE' | 'BUILDING' | 'COMPLEX';
    /** 계산 대상 문서 ID */
    targetId: string;
}
export type JobPayload = AiImageAnalysisPayload | DroneVideoAnalysisPayload | CrackWidthMeasurementPayload | ReportGenerationPayload | RpaBillGenerationPayload | RpaContractExpiryPayload | RpaComplaintIntakePayload | ScheduleAutoGeneratePayload | VideoFrameExtractionPayload | ImageMetadataExtractionPayload | DefectDetectionPayload | CrackAnalysisPayload | DiagnosisOpinionPayload | ComplaintTriagePayload | RiskScoreCalculatePayload | MaintenanceRecommendPayload;
