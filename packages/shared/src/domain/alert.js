"use strict";
// packages/shared/src/domain/alert.ts
// Domain-layer helpers and input types for Alert
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ALERT_RULES = void 0;
const enums_1 = require("../types/enums");
/**
 * 기본 경보 규칙 세트
 */
exports.DEFAULT_ALERT_RULES = [
    {
        id: 'crack-threshold-exceeded',
        name: '균열 임계치 초과',
        description: '측정값이 게이지 포인트의 경보 임계치(thresholdMm)를 초과할 때 HIGH 경보 발령',
        alertType: enums_1.AlertType.CRACK_THRESHOLD,
        condition: { field: 'measuredWidthMm', operator: 'gte', value: 'thresholdMm' },
        severity: enums_1.SeverityLevel.HIGH,
        isActive: true,
    },
    {
        id: 'crack-critical-threshold',
        name: '균열 긴급 임계치 초과 (thresholdMm × 1.5)',
        description: '측정값이 임계치의 1.5배를 초과할 때 CRITICAL 경보 발령',
        alertType: enums_1.AlertType.CRACK_THRESHOLD,
        condition: { field: 'measuredWidthMm', operator: 'gte', value: 'thresholdMm * 1.5' },
        severity: enums_1.SeverityLevel.CRITICAL,
        isActive: true,
    },
    {
        id: 'inspection-overdue',
        name: '점검 미수행',
        description: '예정일로부터 7일 경과 후에도 점검이 완료되지 않은 경우',
        alertType: enums_1.AlertType.INSPECTION_OVERDUE,
        condition: { field: 'daysOverdue', operator: 'gte', value: 7 },
        severity: enums_1.SeverityLevel.MEDIUM,
        isActive: true,
    },
    {
        id: 'contract-expiry-warning',
        name: '계약 만료 30일 전',
        description: '계약 만료일 30일 전 경고 알림',
        alertType: enums_1.AlertType.CONTRACT_EXPIRY,
        condition: { field: 'daysUntilExpiry', operator: 'lte', value: 30 },
        severity: enums_1.SeverityLevel.MEDIUM,
        isActive: true,
    },
];
//# sourceMappingURL=alert.js.map