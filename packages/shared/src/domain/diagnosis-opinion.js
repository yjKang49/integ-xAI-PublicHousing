"use strict";
// packages/shared/src/domain/diagnosis-opinion.ts
// AI 진단 의견 도메인 — 결함/점검세션/게이지포인트를 종합한 AI 초안 의견
// Phase 1 보고서 구조를 깨지 않고 확장 레이어로 추가
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosisTargetType = exports.DiagnosisUrgency = exports.DiagnosisOpinionStatus = void 0;
// ── 열거형 ─────────────────────────────────────────────────────────────────────
/** 진단 의견 처리 상태 */
var DiagnosisOpinionStatus;
(function (DiagnosisOpinionStatus) {
    DiagnosisOpinionStatus["DRAFT"] = "DRAFT";
    DiagnosisOpinionStatus["REVIEWING"] = "REVIEWING";
    DiagnosisOpinionStatus["APPROVED"] = "APPROVED";
    DiagnosisOpinionStatus["REJECTED"] = "REJECTED";
})(DiagnosisOpinionStatus || (exports.DiagnosisOpinionStatus = DiagnosisOpinionStatus = {}));
/** 진단 긴급도 */
var DiagnosisUrgency;
(function (DiagnosisUrgency) {
    DiagnosisUrgency["IMMEDIATE"] = "IMMEDIATE";
    DiagnosisUrgency["URGENT"] = "URGENT";
    DiagnosisUrgency["ROUTINE"] = "ROUTINE";
    DiagnosisUrgency["PLANNED"] = "PLANNED";
})(DiagnosisUrgency || (exports.DiagnosisUrgency = DiagnosisUrgency = {}));
/** 진단 대상 유형 */
var DiagnosisTargetType;
(function (DiagnosisTargetType) {
    DiagnosisTargetType["DEFECT"] = "DEFECT";
    DiagnosisTargetType["INSPECTION_SESSION"] = "INSPECTION_SESSION";
    DiagnosisTargetType["GAUGE_POINT"] = "GAUGE_POINT";
    DiagnosisTargetType["COMPLEX"] = "COMPLEX";
})(DiagnosisTargetType || (exports.DiagnosisTargetType = DiagnosisTargetType = {}));
//# sourceMappingURL=diagnosis-opinion.js.map