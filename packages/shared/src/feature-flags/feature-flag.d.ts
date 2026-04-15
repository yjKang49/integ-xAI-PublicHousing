export interface FeatureFlag {
    _id: string;
    docType: 'featureFlag';
    key: string;
    enabled: boolean;
    description: string;
    enabledForOrgIds?: string[];
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}
export declare enum FeatureFlagKey {
    PHASE2_AI = "phase2.ai",
    PHASE2_RPA = "phase2.rpa",
    PHASE2_IOT = "phase2.iot",
    PHASE2_DRONE = "phase2.drone",
    PHASE2_DIGITAL_TWIN = "phase2.digital_twin",
    AI_AUTO_ACCEPT = "ai.auto_accept",
    AI_DEFECT_DETECTION = "ai.defect_detection",// 결함 후보 자동 탐지 파이프라인
    AI_CRACK_ANALYSIS = "ai.crack_analysis",// 균열 심층 분석 파이프라인 (OpenCV WASM)
    AI_DIAGNOSIS_OPINION = "ai.diagnosis_opinion",// AI 진단 의견 생성 파이프라인 (LLM)
    AI_COMPLAINT_TRIAGE = "ai.complaint_triage",// 민원 AI 자동 분류·우선순위·배정 추천
    RPA_DRY_RUN = "rpa.dry_run"
}
/** Default flag definitions used for seeding — no DB-managed fields */
export declare const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, '_id' | 'createdAt' | 'updatedAt' | 'updatedBy'>[];
