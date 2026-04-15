"use strict";
// packages/shared/src/domain/kpi-record.ts
// Domain-layer types and calculation helpers for KPIRecord
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KPI_TARGETS = void 0;
exports.evaluateKpi = evaluateKpi;
exports.estimatePreventiveSavings = estimatePreventiveSavings;
exports.DEFAULT_KPI_TARGETS = {
    complaintAvgProcessingHours: 24,
    inspectionCompletionRate: 0.95,
    defectRepairRate: 0.85,
    crackAlertCount: 2,
    preventiveMaintenanceRatio: 0.3,
};
/** 목표값 대비 KPI 상태 계산 */
function evaluateKpi(actual, target, direction, warningThreshold = 0.1) {
    if (direction === 'lower-is-better') {
        if (actual <= target)
            return 'ACHIEVED';
        if (actual <= target * (1 + warningThreshold))
            return 'WARNING';
        return 'CRITICAL';
    }
    else {
        if (actual >= target)
            return 'ACHIEVED';
        if (actual >= target * (1 - warningThreshold))
            return 'WARNING';
        return 'CRITICAL';
    }
}
/**
 * 예방 정비 절감 추산 (간이 계산)
 * 공식: 예방점검으로 조기 발견된 결함 수 × 평균 긴급 보수 비용 × 예방 대비 긴급 비용 배율
 */
function estimatePreventiveSavings(earlyFoundDefects, avgEmergencyRepairCostKRW = 2_000_000, preventiveToEmergencyRatio = 0.3) {
    return Math.round(earlyFoundDefects * avgEmergencyRepairCostKRW * (1 - preventiveToEmergencyRatio));
}
//# sourceMappingURL=kpi-record.js.map