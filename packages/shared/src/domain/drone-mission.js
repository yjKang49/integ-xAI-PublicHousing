"use strict";
// packages/shared/src/domain/drone-mission.ts
// 드론 점검 미션 도메인 — 영상/이미지 업로드 및 분석 파이프라인 진입점
Object.defineProperty(exports, "__esModule", { value: true });
exports.DroneMediaItemStatus = exports.DroneMissionStatus = void 0;
// ── 상태 ─────────────────────────────────────────────────────────────────
var DroneMissionStatus;
(function (DroneMissionStatus) {
    DroneMissionStatus["CREATED"] = "CREATED";
    DroneMissionStatus["UPLOADING"] = "UPLOADING";
    DroneMissionStatus["UPLOADED"] = "UPLOADED";
    DroneMissionStatus["PROCESSING"] = "PROCESSING";
    DroneMissionStatus["COMPLETED"] = "COMPLETED";
    DroneMissionStatus["FAILED"] = "FAILED";
})(DroneMissionStatus || (exports.DroneMissionStatus = DroneMissionStatus = {}));
var DroneMediaItemStatus;
(function (DroneMediaItemStatus) {
    DroneMediaItemStatus["PENDING"] = "PENDING";
    DroneMediaItemStatus["UPLOADED"] = "UPLOADED";
    DroneMediaItemStatus["EXTRACTING"] = "EXTRACTING";
    DroneMediaItemStatus["DONE"] = "DONE";
    DroneMediaItemStatus["FAILED"] = "FAILED";
})(DroneMediaItemStatus || (exports.DroneMediaItemStatus = DroneMediaItemStatus = {}));
//# sourceMappingURL=drone-mission.js.map