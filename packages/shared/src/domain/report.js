"use strict";
// packages/shared/src/domain/report.ts
// Domain-layer input types for Report
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_TYPE_LABELS = void 0;
const enums_1 = require("../types/enums");
/**
 * 보고서 유형 레이블 (한국어)
 */
exports.REPORT_TYPE_LABELS = {
    [enums_1.ReportType.INSPECTION_RESULT]: '점검 결과 보고서',
    [enums_1.ReportType.PHOTO_SHEET]: '사진 대지',
    [enums_1.ReportType.DEFECT_LIST]: '결함 목록',
    [enums_1.ReportType.SUMMARY]: '운영 요약 보고서',
    [enums_1.ReportType.CRACK_TREND]: '균열 추이 보고서',
    [enums_1.ReportType.XAI_ASSESSMENT]: '설명가능 AI 책임 평가 보고서',
    [enums_1.ReportType.MAINTENANCE_PLAN]: '장기수선계획',
    [enums_1.ReportType.COMPLAINT_ANALYSIS]: '민원 분석 보고서',
};
//# sourceMappingURL=report.js.map