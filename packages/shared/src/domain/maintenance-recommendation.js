"use strict";
// packages/shared/src/domain/maintenance-recommendation.ts
// Phase 2-9: 장기수선/예지정비 권장 도메인 타입 & 헬퍼
Object.defineProperty(exports, "__esModule", { value: true });
exports.COST_BAND_BY_TYPE = exports.RECOMMENDATION_STATUS_LABELS = exports.MAINTENANCE_TYPE_COLORS = exports.MAINTENANCE_TYPE_LABELS = void 0;
exports.riskLevelToMaintenanceType = riskLevelToMaintenanceType;
exports.calcSuggestedTimeline = calcSuggestedTimeline;
exports.riskLevelToPriority = riskLevelToPriority;
exports.formatCostBand = formatCostBand;
const enums_1 = require("../types/enums");
// ── 레이블 & 표시 헬퍼 ───────────────────────────────────────────────
exports.MAINTENANCE_TYPE_LABELS = {
    [enums_1.MaintenanceType.IMMEDIATE_REPAIR]: '즉시 보수',
    [enums_1.MaintenanceType.SHORT_TERM_REPAIR]: '단기 보수',
    [enums_1.MaintenanceType.SCHEDULED_MAINTENANCE]: '계획 유지보수',
    [enums_1.MaintenanceType.ROUTINE_INSPECTION]: '일상 점검',
    [enums_1.MaintenanceType.REPLACEMENT]: '교체 (장기수선)',
};
exports.MAINTENANCE_TYPE_COLORS = {
    [enums_1.MaintenanceType.IMMEDIATE_REPAIR]: '#880e4f',
    [enums_1.MaintenanceType.SHORT_TERM_REPAIR]: '#c62828',
    [enums_1.MaintenanceType.SCHEDULED_MAINTENANCE]: '#f57c00',
    [enums_1.MaintenanceType.ROUTINE_INSPECTION]: '#2e7d32',
    [enums_1.MaintenanceType.REPLACEMENT]: '#4a148c',
};
exports.RECOMMENDATION_STATUS_LABELS = {
    [enums_1.RecommendationStatus.PENDING]: '검토 대기',
    [enums_1.RecommendationStatus.APPROVED]: '승인됨',
    [enums_1.RecommendationStatus.IN_PROGRESS]: '진행 중',
    [enums_1.RecommendationStatus.COMPLETED]: '완료',
    [enums_1.RecommendationStatus.DEFERRED]: '연기됨',
    [enums_1.RecommendationStatus.REJECTED]: '반려됨',
};
exports.COST_BAND_BY_TYPE = {
    [enums_1.MaintenanceType.IMMEDIATE_REPAIR]: { min: 10_000_000, max: 50_000_000, basis: '긴급 보수 공사 실적 기반' },
    [enums_1.MaintenanceType.SHORT_TERM_REPAIR]: { min: 5_000_000, max: 30_000_000, basis: '단기 보수 유사 공종 기반' },
    [enums_1.MaintenanceType.SCHEDULED_MAINTENANCE]: { min: 1_000_000, max: 15_000_000, basis: '계획 유지보수 단가 기반' },
    [enums_1.MaintenanceType.ROUTINE_INSPECTION]: { min: 100_000, max: 1_000_000, basis: '정기 점검 용역비 기반' },
    [enums_1.MaintenanceType.REPLACEMENT]: { min: 30_000_000, max: 200_000_000, basis: '장기수선계획 교체 단가 기반' },
};
// ── 위험도 → 권장 유지보수 유형 매핑 ────────────────────────────────────
function riskLevelToMaintenanceType(level, isEquipment = false) {
    if (level === enums_1.RiskLevel.CRITICAL)
        return isEquipment ? enums_1.MaintenanceType.REPLACEMENT : enums_1.MaintenanceType.IMMEDIATE_REPAIR;
    if (level === enums_1.RiskLevel.HIGH)
        return enums_1.MaintenanceType.SHORT_TERM_REPAIR;
    if (level === enums_1.RiskLevel.MEDIUM)
        return enums_1.MaintenanceType.SCHEDULED_MAINTENANCE;
    return enums_1.MaintenanceType.ROUTINE_INSPECTION;
}
// ── 권장 일정 계산 ─────────────────────────────────────────────────────
function calcSuggestedTimeline(level) {
    const now = new Date();
    const add = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };
    const config = {
        [enums_1.RiskLevel.CRITICAL]: { earliest: 0, latest: 30, label: '즉시 (1개월 이내)' },
        [enums_1.RiskLevel.HIGH]: { earliest: 14, latest: 180, label: '단기 (3~6개월 이내)' },
        [enums_1.RiskLevel.MEDIUM]: { earliest: 30, latest: 365, label: '계획 (6~12개월 이내)' },
        [enums_1.RiskLevel.LOW]: { earliest: 90, latest: 400, label: '일상 (12개월 이내)' },
    };
    const c = config[level];
    return { earliest: add(c.earliest), latest: add(c.latest), label: c.label };
}
// ── 우선순위 매핑 ─────────────────────────────────────────────────────
function riskLevelToPriority(level) {
    const map = {
        [enums_1.RiskLevel.CRITICAL]: 'IMMEDIATE',
        [enums_1.RiskLevel.HIGH]: 'HIGH',
        [enums_1.RiskLevel.MEDIUM]: 'MEDIUM',
        [enums_1.RiskLevel.LOW]: 'LOW',
    };
    return map[level];
}
/** 비용 포맷 (KRW → 만원 표시) */
function formatCostBand(band) {
    const toMan = (n) => (n / 10_000).toLocaleString('ko') + '만원';
    return `${toMan(band.min)} ~ ${toMan(band.max)}`;
}
//# sourceMappingURL=maintenance-recommendation.js.map