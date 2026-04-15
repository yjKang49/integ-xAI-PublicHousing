"use strict";
// packages/shared/src/domain/defect-candidate.ts
// AI 자동 탐지 결함 후보 — human-in-the-loop 검토 후 Defect로 승격
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateReviewStatus = exports.CandidateSourceType = exports.CandidateDefectType = void 0;
// ── 결함 유형 (탐지 전용) ──────────────────────────────────────────────────────
var CandidateDefectType;
(function (CandidateDefectType) {
    CandidateDefectType["CRACK"] = "CRACK";
    CandidateDefectType["LEAK"] = "LEAK";
    CandidateDefectType["DELAMINATION"] = "DELAMINATION";
    CandidateDefectType["SPOILING"] = "SPOILING";
    CandidateDefectType["CORROSION"] = "CORROSION";
    CandidateDefectType["EFFLORESCENCE"] = "EFFLORESCENCE";
    CandidateDefectType["FIRE_RISK_CLADDING"] = "FIRE_RISK_CLADDING";
    CandidateDefectType["OTHER"] = "OTHER";
})(CandidateDefectType || (exports.CandidateDefectType = CandidateDefectType = {}));
// ── 소스 유형 ──────────────────────────────────────────────────────────────────
var CandidateSourceType;
(function (CandidateSourceType) {
    CandidateSourceType["DRONE_FRAME"] = "DRONE_FRAME";
    CandidateSourceType["DRONE_IMAGE"] = "DRONE_IMAGE";
    CandidateSourceType["MOBILE_PHOTO"] = "MOBILE_PHOTO";
    CandidateSourceType["MANUAL"] = "MANUAL";
})(CandidateSourceType || (exports.CandidateSourceType = CandidateSourceType = {}));
// ── 검토 상태 ──────────────────────────────────────────────────────────────────
var CandidateReviewStatus;
(function (CandidateReviewStatus) {
    CandidateReviewStatus["PENDING"] = "PENDING";
    CandidateReviewStatus["APPROVED"] = "APPROVED";
    CandidateReviewStatus["REJECTED"] = "REJECTED";
    CandidateReviewStatus["PROMOTED"] = "PROMOTED";
})(CandidateReviewStatus || (exports.CandidateReviewStatus = CandidateReviewStatus = {}));
//# sourceMappingURL=defect-candidate.js.map