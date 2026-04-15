"use strict";
// packages/shared/src/domain/media-analysis-job.ts
// 미디어 분석 파이프라인 — 미디어 아이템 1개의 단계별 처리 상태 추적
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStageStatus = void 0;
var PipelineStageStatus;
(function (PipelineStageStatus) {
    PipelineStageStatus["PENDING"] = "PENDING";
    PipelineStageStatus["RUNNING"] = "RUNNING";
    PipelineStageStatus["COMPLETED"] = "COMPLETED";
    PipelineStageStatus["FAILED"] = "FAILED";
    PipelineStageStatus["SKIPPED"] = "SKIPPED";
})(PipelineStageStatus || (exports.PipelineStageStatus = PipelineStageStatus = {}));
//# sourceMappingURL=media-analysis-job.js.map