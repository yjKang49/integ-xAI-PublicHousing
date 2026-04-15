"use strict";
// packages/shared/src/domain/rpa-task.ts
// AX-SPRINT — 지능형 행정자동화 (RPA) 작업 도메인 타입
//
// 자동화 목표 (AX-SPRINT 사업계획서 기준):
//   관리비 고지서 생성:  80% 자동화
//   계약 만료 알림:      100% 자동화
//   민원 접수·분류:      70% 자동화
//   점검 일정 생성:      90% 자동화
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPA_TASK_TYPE_LABELS = exports.RPA_AUTOMATION_TARGETS = void 0;
const enums_1 = require("../types/enums");
/** RPA 작업 타입별 자동화 목표율 */
exports.RPA_AUTOMATION_TARGETS = {
    [enums_1.RpaTaskType.BILL_GENERATION]: 0.80, // 80%
    [enums_1.RpaTaskType.CONTRACT_EXPIRY_NOTICE]: 1.00, // 100%
    [enums_1.RpaTaskType.COMPLAINT_INTAKE]: 0.70, // 70%
    [enums_1.RpaTaskType.INSPECTION_SCHEDULE]: 0.90, // 90%
    [enums_1.RpaTaskType.REPORT_SUBMISSION]: 0.85, // 85%
    [enums_1.RpaTaskType.MILEAGE_GRANT]: 1.00, // 100%
};
/** RPA 작업 타입 한글 레이블 */
exports.RPA_TASK_TYPE_LABELS = {
    [enums_1.RpaTaskType.BILL_GENERATION]: '관리비 고지서 생성',
    [enums_1.RpaTaskType.CONTRACT_EXPIRY_NOTICE]: '계약 만료 알림 발송',
    [enums_1.RpaTaskType.COMPLAINT_INTAKE]: '민원 접수·AI 자동 분류',
    [enums_1.RpaTaskType.INSPECTION_SCHEDULE]: '정기 점검 일정 생성',
    [enums_1.RpaTaskType.REPORT_SUBMISSION]: '안전관리계획 법정 보고',
    [enums_1.RpaTaskType.MILEAGE_GRANT]: '클린하우스 마일리지 지급',
};
//# sourceMappingURL=rpa-task.js.map