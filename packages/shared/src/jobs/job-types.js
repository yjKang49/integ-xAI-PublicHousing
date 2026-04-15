"use strict";
// packages/shared/src/jobs/job-types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_FOR_JOB_TYPE = exports.JOB_WORKER_JOB_TYPES = exports.AI_JOB_TYPES = exports.JobType = void 0;
var JobType;
(function (JobType) {
    // ── AI 분석 큐 (ai-queue) ─────────────────────────────────────────
    JobType["AI_IMAGE_ANALYSIS"] = "AI_IMAGE_ANALYSIS";
    JobType["DRONE_VIDEO_ANALYSIS"] = "DRONE_VIDEO_ANALYSIS";
    JobType["CRACK_WIDTH_MEASUREMENT"] = "CRACK_WIDTH_MEASUREMENT";
    // ── 작업 큐 (job-queue) ───────────────────────────────────────────
    JobType["REPORT_GENERATION"] = "REPORT_GENERATION";
    JobType["RPA_BILL_GENERATION"] = "RPA_BILL_GENERATION";
    JobType["RPA_CONTRACT_EXPIRY"] = "RPA_CONTRACT_EXPIRY";
    JobType["RPA_COMPLAINT_INTAKE"] = "RPA_COMPLAINT_INTAKE";
    JobType["SCHEDULE_AUTO_GENERATE"] = "SCHEDULE_AUTO_GENERATE";
    // ── Phase 2: 드론 미디어 파이프라인 (job-queue) ───────────────────
    JobType["VIDEO_FRAME_EXTRACTION"] = "VIDEO_FRAME_EXTRACTION";
    JobType["IMAGE_METADATA_EXTRACTION"] = "IMAGE_METADATA_EXTRACTION";
    // ── Phase 2: 결함 자동 탐지 파이프라인 (ai-queue) ────────────────
    JobType["DEFECT_DETECTION"] = "DEFECT_DETECTION";
    // ── Phase 2: 균열 심층 분석 파이프라인 (ai-queue) ─────────────────
    JobType["CRACK_ANALYSIS"] = "CRACK_ANALYSIS";
    // ── Phase 2: AI 진단 의견 파이프라인 (ai-queue) ───────────────────
    JobType["DIAGNOSIS_OPINION"] = "DIAGNOSIS_OPINION";
    // ── Phase 2-6: 민원 AI 트리아지 파이프라인 (ai-queue) ────────────
    JobType["COMPLAINT_TRIAGE"] = "COMPLAINT_TRIAGE";
    // ── Phase 2-7: RPA/업무 자동화 엔진 (job-queue) ──────────────────
    JobType["AUTOMATION_RULE_EXECUTE"] = "AUTOMATION_RULE_EXECUTE";
    JobType["AUTOMATION_RULE_SCAN"] = "AUTOMATION_RULE_SCAN";
    JobType["NOTIFICATION_SEND"] = "NOTIFICATION_SEND";
    // ── Phase 2-9: 예지정비 & 장기수선 의사결정 (job-queue) ──────────
    JobType["RISK_SCORE_CALCULATE"] = "RISK_SCORE_CALCULATE";
    JobType["MAINTENANCE_RECOMMEND"] = "MAINTENANCE_RECOMMEND";
})(JobType || (exports.JobType = JobType = {}));
/** AI 처리 큐로 라우팅될 작업 유형 */
exports.AI_JOB_TYPES = [
    JobType.AI_IMAGE_ANALYSIS,
    JobType.DRONE_VIDEO_ANALYSIS,
    JobType.CRACK_WIDTH_MEASUREMENT,
    JobType.DEFECT_DETECTION,
    JobType.CRACK_ANALYSIS,
    JobType.DIAGNOSIS_OPINION,
    JobType.COMPLAINT_TRIAGE,
];
/** 범용 작업 큐로 라우팅될 작업 유형 */
exports.JOB_WORKER_JOB_TYPES = [
    JobType.REPORT_GENERATION,
    JobType.RPA_BILL_GENERATION,
    JobType.RPA_CONTRACT_EXPIRY,
    JobType.RPA_COMPLAINT_INTAKE,
    JobType.SCHEDULE_AUTO_GENERATE,
    JobType.VIDEO_FRAME_EXTRACTION,
    JobType.IMAGE_METADATA_EXTRACTION,
    JobType.AUTOMATION_RULE_EXECUTE,
    JobType.AUTOMATION_RULE_SCAN,
    JobType.NOTIFICATION_SEND,
    // Phase 2-9
    JobType.RISK_SCORE_CALCULATE,
    JobType.MAINTENANCE_RECOMMEND,
];
/** 작업 유형 → Bull 큐 이름 매핑 */
exports.QUEUE_FOR_JOB_TYPE = {
    [JobType.AI_IMAGE_ANALYSIS]: 'ai-queue',
    [JobType.DRONE_VIDEO_ANALYSIS]: 'ai-queue',
    [JobType.CRACK_WIDTH_MEASUREMENT]: 'ai-queue',
    [JobType.REPORT_GENERATION]: 'job-queue',
    [JobType.RPA_BILL_GENERATION]: 'job-queue',
    [JobType.RPA_CONTRACT_EXPIRY]: 'job-queue',
    [JobType.RPA_COMPLAINT_INTAKE]: 'job-queue',
    [JobType.SCHEDULE_AUTO_GENERATE]: 'job-queue',
    [JobType.VIDEO_FRAME_EXTRACTION]: 'job-queue',
    [JobType.IMAGE_METADATA_EXTRACTION]: 'job-queue',
    [JobType.DEFECT_DETECTION]: 'ai-queue',
    [JobType.CRACK_ANALYSIS]: 'ai-queue',
    [JobType.DIAGNOSIS_OPINION]: 'ai-queue',
    [JobType.COMPLAINT_TRIAGE]: 'ai-queue',
    [JobType.AUTOMATION_RULE_EXECUTE]: 'job-queue',
    [JobType.AUTOMATION_RULE_SCAN]: 'job-queue',
    [JobType.NOTIFICATION_SEND]: 'job-queue',
    // Phase 2-9
    [JobType.RISK_SCORE_CALCULATE]: 'job-queue',
    [JobType.MAINTENANCE_RECOMMEND]: 'job-queue',
};
//# sourceMappingURL=job-types.js.map