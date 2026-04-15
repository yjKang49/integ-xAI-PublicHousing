"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// packages/shared/src/index.ts
__exportStar(require("./types/enums"), exports);
__exportStar(require("./types/couch"), exports);
__exportStar(require("./types/entities"), exports);
__exportStar(require("./types/api"), exports);
__exportStar(require("./auth/auth-user"), exports);
// domain/ re-exports entities with Input types — use these in frontend forms
__exportStar(require("./domain/organization"), exports);
__exportStar(require("./domain/housing-complex"), exports);
__exportStar(require("./domain/building"), exports);
__exportStar(require("./domain/floor"), exports);
__exportStar(require("./domain/zone"), exports);
__exportStar(require("./domain/defect"), exports);
__exportStar(require("./domain/defect-media"), exports);
__exportStar(require("./domain/defect-marker-3d"), exports);
__exportStar(require("./domain/complaint"), exports);
__exportStar(require("./domain/work-order"), exports);
// Crack monitoring domain types
__exportStar(require("./domain/crack-gauge-point"), exports);
__exportStar(require("./domain/crack-measurement"), exports);
__exportStar(require("./domain/alert"), exports);
// Reports & KPI domain types
__exportStar(require("./domain/report"), exports);
__exportStar(require("./domain/kpi-record"), exports);
// AX-SPRINT 도메인 타입
__exportStar(require("./domain/rpa-task"), exports);
// Note: auth/role.ts re-exports UserRole — already exported from types/enums above.
// Phase 2: async job infrastructure & feature flags
__exportStar(require("./jobs"), exports);
__exportStar(require("./feature-flags"), exports);
// Phase 2: drone media pipeline domain types
__exportStar(require("./domain/drone-mission"), exports);
__exportStar(require("./domain/media-frame"), exports);
__exportStar(require("./domain/media-analysis-job"), exports);
// Phase 2: AI 결함 탐지 파이프라인 도메인 타입
__exportStar(require("./domain/defect-candidate"), exports);
__exportStar(require("./ai/vision-detection-result"), exports);
// Phase 2: 균열 심층 분석 파이프라인 도메인 타입
__exportStar(require("./cv/crack-analysis-types"), exports);
__exportStar(require("./domain/crack-analysis-result"), exports);
// Phase 2: AI 진단 의견 파이프라인 도메인 타입
__exportStar(require("./domain/diagnosis-opinion"), exports);
__exportStar(require("./domain/repair-recommendation"), exports);
// Phase 2-6: 민원 AI 트리아지 도메인 타입
__exportStar(require("./domain/complaint-triage"), exports);
// Phase 2-7: RPA/업무 자동화 엔진 도메인 타입
__exportStar(require("./domain/automation-rule"), exports);
__exportStar(require("./domain/automation-execution"), exports);
// Phase 2-8: IoT 센서 연동 도메인 타입
__exportStar(require("./domain/sensor-device"), exports);
__exportStar(require("./domain/sensor-reading"), exports);
// Phase 2-9: 예지정비 & 장기수선 의사결정 도메인 타입
__exportStar(require("./domain/risk-score"), exports);
__exportStar(require("./domain/maintenance-recommendation"), exports);
//# sourceMappingURL=index.js.map