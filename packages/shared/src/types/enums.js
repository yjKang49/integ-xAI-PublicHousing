"use strict";
// ============================================================
// packages/shared/src/types/enums.ts
// Shared enums used across API, Admin Web, and Mobile App
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationExecutionStatus = exports.AutomationRuleCategory = exports.NotificationChannel = exports.AutomationActionType = exports.AutomationTriggerType = exports.SensorReadingQuality = exports.SensorStatus = exports.SensorType = exports.RiskTargetType = exports.RecommendationStatus = exports.MaintenanceType = exports.RiskLevel = exports.AlertType = exports.RpaTaskStatus = exports.RpaTaskType = exports.AiConfidenceLevel = exports.AiDetectionMethod = exports.SyncStatus = exports.ReportType = exports.MediaType = exports.FacilityAssetType = exports.AlertStatus = exports.ComplaintCategory = exports.WorkOrderStatus = exports.ComplaintStatus = exports.SessionStatus = exports.InspectionStatus = exports.SeverityLevel = exports.DefectType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ORG_ADMIN"] = "ORG_ADMIN";
    UserRole["INSPECTOR"] = "INSPECTOR";
    UserRole["REVIEWER"] = "REVIEWER";
    UserRole["COMPLAINT_MGR"] = "COMPLAINT_MGR";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
var DefectType;
(function (DefectType) {
    DefectType["CRACK"] = "CRACK";
    DefectType["LEAK"] = "LEAK";
    DefectType["SPALLING"] = "SPALLING";
    DefectType["CORROSION"] = "CORROSION";
    DefectType["EFFLORESCENCE"] = "EFFLORESCENCE";
    DefectType["DEFORMATION"] = "DEFORMATION";
    DefectType["SETTLEMENT"] = "SETTLEMENT";
    DefectType["OTHER"] = "OTHER";
})(DefectType || (exports.DefectType = DefectType = {}));
var SeverityLevel;
(function (SeverityLevel) {
    SeverityLevel["LOW"] = "LOW";
    SeverityLevel["MEDIUM"] = "MEDIUM";
    SeverityLevel["HIGH"] = "HIGH";
    SeverityLevel["CRITICAL"] = "CRITICAL";
})(SeverityLevel || (exports.SeverityLevel = SeverityLevel = {}));
var InspectionStatus;
(function (InspectionStatus) {
    InspectionStatus["PLANNED"] = "PLANNED";
    InspectionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    InspectionStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    InspectionStatus["REVIEWED"] = "REVIEWED";
    InspectionStatus["COMPLETED"] = "COMPLETED";
    InspectionStatus["CANCELLED"] = "CANCELLED";
})(InspectionStatus || (exports.InspectionStatus = InspectionStatus = {}));
/** 세션별 세분화된 상태 — 모바일 점검 워크플로우에 사용 */
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["DRAFT"] = "DRAFT";
    SessionStatus["ASSIGNED"] = "ASSIGNED";
    SessionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SessionStatus["SUBMITTED"] = "SUBMITTED";
    SessionStatus["APPROVED"] = "APPROVED";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var ComplaintStatus;
(function (ComplaintStatus) {
    ComplaintStatus["OPEN"] = "OPEN";
    ComplaintStatus["RECEIVED"] = "RECEIVED";
    ComplaintStatus["TRIAGED"] = "TRIAGED";
    ComplaintStatus["ASSIGNED"] = "ASSIGNED";
    ComplaintStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ComplaintStatus["RESOLVED"] = "RESOLVED";
    ComplaintStatus["CLOSED"] = "CLOSED";
})(ComplaintStatus || (exports.ComplaintStatus = ComplaintStatus = {}));
var WorkOrderStatus;
(function (WorkOrderStatus) {
    WorkOrderStatus["OPEN"] = "OPEN";
    WorkOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    WorkOrderStatus["COMPLETED"] = "COMPLETED";
    WorkOrderStatus["CANCELLED"] = "CANCELLED";
})(WorkOrderStatus || (exports.WorkOrderStatus = WorkOrderStatus = {}));
var ComplaintCategory;
(function (ComplaintCategory) {
    ComplaintCategory["FACILITY"] = "FACILITY";
    ComplaintCategory["NOISE"] = "NOISE";
    ComplaintCategory["SANITATION"] = "SANITATION";
    ComplaintCategory["SAFETY"] = "SAFETY";
    ComplaintCategory["PARKING"] = "PARKING";
    ComplaintCategory["ELEVATOR"] = "ELEVATOR";
    ComplaintCategory["OTHER"] = "OTHER";
})(ComplaintCategory || (exports.ComplaintCategory = ComplaintCategory = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "ACTIVE";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["RESOLVED"] = "RESOLVED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var FacilityAssetType;
(function (FacilityAssetType) {
    FacilityAssetType["STRUCTURAL"] = "STRUCTURAL";
    FacilityAssetType["EXTERIOR"] = "EXTERIOR";
    FacilityAssetType["INTERIOR"] = "INTERIOR";
    FacilityAssetType["MECHANICAL"] = "MECHANICAL";
    FacilityAssetType["ELECTRICAL"] = "ELECTRICAL";
    FacilityAssetType["PLUMBING"] = "PLUMBING";
    FacilityAssetType["ROOF"] = "ROOF";
    FacilityAssetType["UNDERGROUND"] = "UNDERGROUND";
})(FacilityAssetType || (exports.FacilityAssetType = FacilityAssetType = {}));
var MediaType;
(function (MediaType) {
    MediaType["PHOTO"] = "PHOTO";
    MediaType["VIDEO"] = "VIDEO";
    MediaType["DRAWING"] = "DRAWING";
    MediaType["MODEL_3D"] = "MODEL_3D";
    MediaType["DRONE_VIDEO"] = "DRONE_VIDEO";
})(MediaType || (exports.MediaType = MediaType = {}));
var ReportType;
(function (ReportType) {
    ReportType["INSPECTION_RESULT"] = "INSPECTION_RESULT";
    ReportType["PHOTO_SHEET"] = "PHOTO_SHEET";
    ReportType["DEFECT_LIST"] = "DEFECT_LIST";
    ReportType["SUMMARY"] = "SUMMARY";
    ReportType["CRACK_TREND"] = "CRACK_TREND";
    ReportType["XAI_ASSESSMENT"] = "XAI_ASSESSMENT";
    ReportType["MAINTENANCE_PLAN"] = "MAINTENANCE_PLAN";
    ReportType["COMPLAINT_ANALYSIS"] = "COMPLAINT_ANALYSIS";
})(ReportType || (exports.ReportType = ReportType = {}));
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "SYNCED";
    SyncStatus["PENDING"] = "PENDING";
    SyncStatus["CONFLICT"] = "CONFLICT";
    SyncStatus["ERROR"] = "ERROR";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
// ── AX-SPRINT 추가 열거형 ─────────────────────────────────────────────
/**
 * AI 결함 탐지 방법 (AX-SPRINT — AI 현장점검 10단계 자동화)
 * 4단계 신뢰도 점수 시스템과 연동:
 *   ≥ 90%  → AUTO_ACCEPT (자동 확정 입력)
 *   80~89% → REQUIRES_REVIEW (엔지니어 확인 버튼 클릭 필요)
 *   < 80%  → MANUAL_REQUIRED (수동 입력 유도)
 */
var AiDetectionMethod;
(function (AiDetectionMethod) {
    AiDetectionMethod["MASK_RCNN"] = "MASK_RCNN";
    AiDetectionMethod["Y_MASKNET"] = "Y_MASKNET";
    AiDetectionMethod["OPENCV_WASM"] = "OPENCV_WASM";
    AiDetectionMethod["RESIDENT_PHOTO"] = "RESIDENT_PHOTO";
    AiDetectionMethod["MANUAL"] = "MANUAL";
})(AiDetectionMethod || (exports.AiDetectionMethod = AiDetectionMethod = {}));
/**
 * AI 신뢰도 등급 (AX-SPRINT 4단계: AI Confidence Score)
 */
var AiConfidenceLevel;
(function (AiConfidenceLevel) {
    AiConfidenceLevel["AUTO_ACCEPT"] = "AUTO_ACCEPT";
    AiConfidenceLevel["REQUIRES_REVIEW"] = "REQUIRES_REVIEW";
    AiConfidenceLevel["MANUAL_REQUIRED"] = "MANUAL_REQUIRED";
})(AiConfidenceLevel || (exports.AiConfidenceLevel = AiConfidenceLevel = {}));
/**
 * RPA 자동화 작업 유형 (AX-SPRINT — 지능형 행정자동화)
 * - 관리비 고지서 생성: 80% 자동화
 * - 계약 만료 알림:     100% 자동화
 * - 민원 접수·분류:     70% 자동화
 * - 점검 일정 생성:     90% 자동화
 */
var RpaTaskType;
(function (RpaTaskType) {
    RpaTaskType["BILL_GENERATION"] = "BILL_GENERATION";
    RpaTaskType["CONTRACT_EXPIRY_NOTICE"] = "CONTRACT_EXPIRY_NOTICE";
    RpaTaskType["COMPLAINT_INTAKE"] = "COMPLAINT_INTAKE";
    RpaTaskType["INSPECTION_SCHEDULE"] = "INSPECTION_SCHEDULE";
    RpaTaskType["REPORT_SUBMISSION"] = "REPORT_SUBMISSION";
    RpaTaskType["MILEAGE_GRANT"] = "MILEAGE_GRANT";
})(RpaTaskType || (exports.RpaTaskType = RpaTaskType = {}));
var RpaTaskStatus;
(function (RpaTaskStatus) {
    RpaTaskStatus["PENDING"] = "PENDING";
    RpaTaskStatus["RUNNING"] = "RUNNING";
    RpaTaskStatus["COMPLETED"] = "COMPLETED";
    RpaTaskStatus["FAILED"] = "FAILED";
    RpaTaskStatus["SKIPPED"] = "SKIPPED";
})(RpaTaskStatus || (exports.RpaTaskStatus = RpaTaskStatus = {}));
var AlertType;
(function (AlertType) {
    AlertType["CRACK_THRESHOLD"] = "CRACK_THRESHOLD";
    AlertType["INSPECTION_OVERDUE"] = "INSPECTION_OVERDUE";
    AlertType["CONTRACT_EXPIRY"] = "CONTRACT_EXPIRY";
    AlertType["DEFECT_CRITICAL"] = "DEFECT_CRITICAL";
    AlertType["COMPLAINT_OVERDUE"] = "COMPLAINT_OVERDUE";
    AlertType["DRONE_DEFECT"] = "DRONE_DEFECT";
    AlertType["RPA_FAILURE"] = "RPA_FAILURE";
    AlertType["AUTOMATION_FAILURE"] = "AUTOMATION_FAILURE";
    AlertType["IOT_THRESHOLD"] = "IOT_THRESHOLD";
})(AlertType || (exports.AlertType = AlertType = {}));
// ── Phase 2-9: 예지정비 & 장기수선 의사결정 열거형 ─────────────────────
/** 위험도 등급 */
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
/** 권장 유지보수 유형 */
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["IMMEDIATE_REPAIR"] = "IMMEDIATE_REPAIR";
    MaintenanceType["SHORT_TERM_REPAIR"] = "SHORT_TERM_REPAIR";
    MaintenanceType["SCHEDULED_MAINTENANCE"] = "SCHEDULED_MAINTENANCE";
    MaintenanceType["ROUTINE_INSPECTION"] = "ROUTINE_INSPECTION";
    MaintenanceType["REPLACEMENT"] = "REPLACEMENT";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
/** 예지정비 추천 상태 */
var RecommendationStatus;
(function (RecommendationStatus) {
    RecommendationStatus["PENDING"] = "PENDING";
    RecommendationStatus["APPROVED"] = "APPROVED";
    RecommendationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RecommendationStatus["COMPLETED"] = "COMPLETED";
    RecommendationStatus["DEFERRED"] = "DEFERRED";
    RecommendationStatus["REJECTED"] = "REJECTED";
})(RecommendationStatus || (exports.RecommendationStatus = RecommendationStatus = {}));
/** 리스크 계산 대상 유형 */
var RiskTargetType;
(function (RiskTargetType) {
    RiskTargetType["ASSET"] = "ASSET";
    RiskTargetType["ZONE"] = "ZONE";
    RiskTargetType["BUILDING"] = "BUILDING";
    RiskTargetType["COMPLEX"] = "COMPLEX";
})(RiskTargetType || (exports.RiskTargetType = RiskTargetType = {}));
// ── Phase 2-8: IoT 센서 연동 열거형 ────────────────────────────────────
/** IoT 센서 유형 */
var SensorType;
(function (SensorType) {
    SensorType["TEMPERATURE"] = "TEMPERATURE";
    SensorType["HUMIDITY"] = "HUMIDITY";
    SensorType["VIBRATION"] = "VIBRATION";
    SensorType["LEAK"] = "LEAK";
    SensorType["POWER"] = "POWER";
    SensorType["CO2"] = "CO2";
    SensorType["PRESSURE"] = "PRESSURE";
    SensorType["WATER_LEVEL"] = "WATER_LEVEL";
})(SensorType || (exports.SensorType = SensorType = {}));
/** IoT 센서 운영 상태 */
var SensorStatus;
(function (SensorStatus) {
    SensorStatus["ACTIVE"] = "ACTIVE";
    SensorStatus["INACTIVE"] = "INACTIVE";
    SensorStatus["ERROR"] = "ERROR";
    SensorStatus["MAINTENANCE"] = "MAINTENANCE";
})(SensorStatus || (exports.SensorStatus = SensorStatus = {}));
/** 센서 측정값 품질 등급 */
var SensorReadingQuality;
(function (SensorReadingQuality) {
    SensorReadingQuality["GOOD"] = "GOOD";
    SensorReadingQuality["FAIR"] = "FAIR";
    SensorReadingQuality["POOR"] = "POOR";
})(SensorReadingQuality || (exports.SensorReadingQuality = SensorReadingQuality = {}));
// ── Phase 2-7: RPA/업무 자동화 엔진 열거형 ───────────────────────────────
/** 자동화 룰 트리거 유형 */
var AutomationTriggerType;
(function (AutomationTriggerType) {
    AutomationTriggerType["DATE_BASED"] = "DATE_BASED";
    AutomationTriggerType["STATUS_CHANGE"] = "STATUS_CHANGE";
    AutomationTriggerType["THRESHOLD"] = "THRESHOLD";
    AutomationTriggerType["MANUAL"] = "MANUAL";
})(AutomationTriggerType || (exports.AutomationTriggerType = AutomationTriggerType = {}));
/** 자동화 룰 액션 유형 */
var AutomationActionType;
(function (AutomationActionType) {
    AutomationActionType["SEND_NOTIFICATION"] = "SEND_NOTIFICATION";
    AutomationActionType["CREATE_ALERT"] = "CREATE_ALERT";
    AutomationActionType["CREATE_SCHEDULE"] = "CREATE_SCHEDULE";
    AutomationActionType["CREATE_WORK_ORDER"] = "CREATE_WORK_ORDER";
    AutomationActionType["UPDATE_STATUS"] = "UPDATE_STATUS";
})(AutomationActionType || (exports.AutomationActionType = AutomationActionType = {}));
/** 알림 채널 */
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
/** 자동화 룰 카테고리 */
var AutomationRuleCategory;
(function (AutomationRuleCategory) {
    AutomationRuleCategory["CONTRACT"] = "CONTRACT";
    AutomationRuleCategory["INSPECTION"] = "INSPECTION";
    AutomationRuleCategory["COMPLAINT"] = "COMPLAINT";
    AutomationRuleCategory["DEFECT"] = "DEFECT";
    AutomationRuleCategory["MAINTENANCE"] = "MAINTENANCE";
})(AutomationRuleCategory || (exports.AutomationRuleCategory = AutomationRuleCategory = {}));
/** 자동화 실행 상태 */
var AutomationExecutionStatus;
(function (AutomationExecutionStatus) {
    AutomationExecutionStatus["RUNNING"] = "RUNNING";
    AutomationExecutionStatus["COMPLETED"] = "COMPLETED";
    AutomationExecutionStatus["FAILED"] = "FAILED";
    AutomationExecutionStatus["SKIPPED"] = "SKIPPED";
})(AutomationExecutionStatus || (exports.AutomationExecutionStatus = AutomationExecutionStatus = {}));
//# sourceMappingURL=enums.js.map