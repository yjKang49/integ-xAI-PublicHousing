"use strict";
// packages/shared/src/domain/crack-analysis-result.ts
// 균열 분석 결과 도메인 — CrackMeasurement와 분리된 별도 analysis layer
// Phase 1 CrackMeasurement를 수정하지 않고 별도 문서로 심층 분석 결과를 보강한다.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrackAnalysisReviewStatus = exports.CrackAnalysisStatus = void 0;
// ── 상태 열거형 ────────────────────────────────────────────────────────────────
var CrackAnalysisStatus;
(function (CrackAnalysisStatus) {
    CrackAnalysisStatus["PENDING"] = "PENDING";
    CrackAnalysisStatus["RUNNING"] = "RUNNING";
    CrackAnalysisStatus["COMPLETED"] = "COMPLETED";
    CrackAnalysisStatus["FAILED"] = "FAILED";
    CrackAnalysisStatus["OVERRIDDEN"] = "OVERRIDDEN";
})(CrackAnalysisStatus || (exports.CrackAnalysisStatus = CrackAnalysisStatus = {}));
var CrackAnalysisReviewStatus;
(function (CrackAnalysisReviewStatus) {
    CrackAnalysisReviewStatus["PENDING"] = "PENDING";
    CrackAnalysisReviewStatus["ACCEPTED"] = "ACCEPTED";
    CrackAnalysisReviewStatus["CORRECTED"] = "CORRECTED";
    CrackAnalysisReviewStatus["REJECTED"] = "REJECTED";
})(CrackAnalysisReviewStatus || (exports.CrackAnalysisReviewStatus = CrackAnalysisReviewStatus = {}));
//# sourceMappingURL=crack-analysis-result.js.map