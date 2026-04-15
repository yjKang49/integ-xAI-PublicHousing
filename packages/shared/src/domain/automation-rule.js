"use strict";
// packages/shared/src/domain/automation-rule.ts
// Phase 2-7: RPA/업무 자동화 엔진 — AutomationRule 도메인 타입
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_ACTION_TYPE_LABELS = exports.AUTOMATION_TRIGGER_TYPE_LABELS = exports.AUTOMATION_RULE_CATEGORY_LABELS = exports.AUTOMATION_RULE_KEYS = void 0;
const enums_1 = require("../types/enums");
// ── 사전 정의된 룰 키 상수 ────────────────────────────────────────────────
exports.AUTOMATION_RULE_KEYS = {
    CONTRACT_EXPIRY_30D: 'contract_expiry_30d', // 계약 만료 30일 전
    CONTRACT_EXPIRY_7D: 'contract_expiry_7d', // 계약 만료 7일 전
    INSPECTION_SCHEDULE_AUTO: 'inspection_schedule_auto', // 정기 점검 일정 자동 생성
    COMPLAINT_RESOLVED_NOTIFY: 'complaint_resolved_notify', // 민원 처리 완료 통지
    INSPECTION_REMINDER: 'inspection_reminder', // 점검 미수행 리마인드
};
/** 룰 카테고리 레이블 (UI 표시용) */
exports.AUTOMATION_RULE_CATEGORY_LABELS = {
    [enums_1.AutomationRuleCategory.CONTRACT]: '계약 관리',
    [enums_1.AutomationRuleCategory.INSPECTION]: '점검 관리',
    [enums_1.AutomationRuleCategory.COMPLAINT]: '민원 관리',
    [enums_1.AutomationRuleCategory.DEFECT]: '결함 관리',
    [enums_1.AutomationRuleCategory.MAINTENANCE]: '유지관리',
};
/** 트리거 타입 레이블 (UI 표시용) */
exports.AUTOMATION_TRIGGER_TYPE_LABELS = {
    [enums_1.AutomationTriggerType.DATE_BASED]: '날짜 기반',
    [enums_1.AutomationTriggerType.STATUS_CHANGE]: '상태 변경',
    [enums_1.AutomationTriggerType.THRESHOLD]: '임계치 초과',
    [enums_1.AutomationTriggerType.MANUAL]: '수동 실행',
};
/** 액션 타입 레이블 (UI 표시용) */
exports.AUTOMATION_ACTION_TYPE_LABELS = {
    [enums_1.AutomationActionType.SEND_NOTIFICATION]: '알림 발송',
    [enums_1.AutomationActionType.CREATE_ALERT]: '경보 생성',
    [enums_1.AutomationActionType.CREATE_SCHEDULE]: '점검 일정 생성',
    [enums_1.AutomationActionType.CREATE_WORK_ORDER]: '작업지시 생성',
    [enums_1.AutomationActionType.UPDATE_STATUS]: '상태 변경',
};
//# sourceMappingURL=automation-rule.js.map