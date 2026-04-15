export declare enum PipelineStageStatus {
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED"
}
export interface PipelineStage {
    status: PipelineStageStatus;
    jobId?: string;
    startedAt?: string;
    completedAt?: string;
    result?: Record<string, any>;
    error?: string;
}
/**
 * 미디어 아이템 1개의 분석 파이프라인 상태 문서.
 * 단계 순서: metadataExtraction → frameExtraction (VIDEO만) → aiAnalysis
 */
export interface MediaAnalysisPipeline {
    _id: string;
    _rev?: string;
    docType: 'mediaPipeline';
    orgId: string;
    missionId: string;
    mediaItemId: string;
    storageKey: string;
    mediaType: 'VIDEO' | 'IMAGE';
    stages: {
        metadataExtraction: PipelineStage;
        frameExtraction: PipelineStage;
        aiAnalysis: PipelineStage;
    };
    overallStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    /** 프레임 추출 결과: 추출된 프레임 S3 키 목록 */
    extractedFrameKeys?: string[];
    /** 프레임 추출 결과: 총 프레임 수 */
    frameCount?: number;
    createdAt: string;
    updatedAt: string;
}
