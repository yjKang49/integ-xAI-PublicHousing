"use strict";
// packages/shared/src/domain/repair-recommendation.ts
// 보수·보강 추천 도메인 — DiagnosisOpinion에서 파생된 단위 조치 추천
// 승인된 항목만 PDF 보고서에 포함 가능
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairTimeline = void 0;
// ── 열거형 ─────────────────────────────────────────────────────────────────────
/** 추천 조치 시행 기한 */
var RepairTimeline;
(function (RepairTimeline) {
    RepairTimeline["IMMEDIATE"] = "IMMEDIATE";
    RepairTimeline["WITHIN_1_WEEK"] = "WITHIN_1_WEEK";
    RepairTimeline["WITHIN_1_MONTH"] = "WITHIN_1_MONTH";
    RepairTimeline["WITHIN_3_MONTHS"] = "WITHIN_3_MONTHS";
    RepairTimeline["ANNUAL_PLAN"] = "ANNUAL_PLAN";
})(RepairTimeline || (exports.RepairTimeline = RepairTimeline = {}));
//# sourceMappingURL=repair-recommendation.js.map