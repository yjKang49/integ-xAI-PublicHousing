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
    AI_DEFECT_DETECTION = "ai.defect_detection",
    AI_CRACK_ANALYSIS = "ai.crack_analysis",
    AI_DIAGNOSIS_OPINION = "ai.diagnosis_opinion",
    AI_COMPLAINT_TRIAGE = "ai.complaint_triage",
    RPA_DRY_RUN = "rpa.dry_run",
    AI_ANTIGRAVITY_ENGINE = "ai.antigravity_engine",
    AI_FEM_VALIDATION = "ai.fem_validation",
    AI_LIO_SLAM = "ai.lio_slam",
    AI_VIDEO_DEIDENTIFY = "ai.video_deidentify",
    AI_AGING_CURVE_PREDICT = "ai.aging_curve_predict",
    AI_LEGAL_REPORT = "ai.legal_report",
    EXTERNAL_KALIS_FMS = "external.kalis_fms",
    EXTERNAL_SEJUMTEO = "external.sejumteo"
}
/** Default flag definitions used for seeding — no DB-managed fields */
export declare const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, '_id' | 'createdAt' | 'updatedAt' | 'updatedBy'>[];
