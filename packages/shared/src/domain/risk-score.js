"use strict";
// packages/shared/src/domain/risk-score.ts
// Phase 2-9: 위험도 스코어 도메인 타입 & 공식 헬퍼
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_WEIGHTS = exports.RISK_TARGET_TYPE_LABELS = exports.RISK_LEVEL_BG = exports.RISK_LEVEL_COLORS = exports.RISK_LEVEL_LABELS = void 0;
exports.scoreToLevel = scoreToLevel;
exports.calcDefectScore = calcDefectScore;
exports.calcCrackScore = calcCrackScore;
exports.calcSensorScore = calcSensorScore;
exports.calcComplaintScore = calcComplaintScore;
exports.calcAgeScore = calcAgeScore;
const enums_1 = require("../types/enums");
// ── 위험도 등급 헬퍼 ──────────────────────────────────────────────────
function scoreToLevel(score) {
    if (score >= 76)
        return enums_1.RiskLevel.CRITICAL;
    if (score >= 51)
        return enums_1.RiskLevel.HIGH;
    if (score >= 26)
        return enums_1.RiskLevel.MEDIUM;
    return enums_1.RiskLevel.LOW;
}
exports.RISK_LEVEL_LABELS = {
    [enums_1.RiskLevel.LOW]: '낮음',
    [enums_1.RiskLevel.MEDIUM]: '보통',
    [enums_1.RiskLevel.HIGH]: '높음',
    [enums_1.RiskLevel.CRITICAL]: '긴급',
};
exports.RISK_LEVEL_COLORS = {
    [enums_1.RiskLevel.LOW]: '#2e7d32',
    [enums_1.RiskLevel.MEDIUM]: '#f57c00',
    [enums_1.RiskLevel.HIGH]: '#c62828',
    [enums_1.RiskLevel.CRITICAL]: '#880e4f',
};
exports.RISK_LEVEL_BG = {
    [enums_1.RiskLevel.LOW]: '#e8f5e9',
    [enums_1.RiskLevel.MEDIUM]: '#fff3e0',
    [enums_1.RiskLevel.HIGH]: '#ffebee',
    [enums_1.RiskLevel.CRITICAL]: '#fce4ec',
};
exports.RISK_TARGET_TYPE_LABELS = {
    [enums_1.RiskTargetType.ASSET]: '시설물 자산',
    [enums_1.RiskTargetType.ZONE]: '구역',
    [enums_1.RiskTargetType.BUILDING]: '건물',
    [enums_1.RiskTargetType.COMPLEX]: '단지',
};
// ── 가중치 정의 (합 = 1.0) ────────────────────────────────────────────
exports.RISK_WEIGHTS = {
    defect: 0.30, // 결함 현황 30%
    crack: 0.25, // 균열 모니터링 25%
    sensor: 0.20, // IoT 센서 이상 20%
    complaint: 0.15, // 민원 현황 15%
    age: 0.10, // 자산 노후도 10%
};
// ── 서브스코어 계산 공식 ───────────────────────────────────────────────
/**
 * 결함 서브스코어 계산
 * - CRITICAL: 30점 / 개 (cap: 90)
 * - HIGH: 15점 / 개 (cap: 60)
 * - MEDIUM: 5점 / 개 (cap: 30)
 * - 미수리 비율 × 20점 추가
 */
function calcDefectScore(unrepairedCount, criticalCount, highCount, mediumCount, totalCount) {
    const raw = Math.min(criticalCount * 30, 90)
        + Math.min(highCount * 15, 60)
        + Math.min(mediumCount * 5, 30);
    const repairRatioPenalty = totalCount > 0 ? (unrepairedCount / totalCount) * 20 : 0;
    const score = Math.min(Math.round(raw + repairRatioPenalty), 100);
    const details = `미수리 ${unrepairedCount}건 (긴급 ${criticalCount} / 높음 ${highCount} / 보통 ${mediumCount})`;
    return { score, details };
}
/**
 * 균열 서브스코어 계산
 * - 임계치 초과 건수 × 25점 (cap: 75)
 * - 최대 균열폭 기반 추가 (1mm 초과 시 +25)
 */
function calcCrackScore(exceedCount, maxWidthMm) {
    const exceedPenalty = Math.min(exceedCount * 25, 75);
    const widthPenalty = maxWidthMm != null && maxWidthMm > 1.0 ? Math.min((maxWidthMm - 1) * 12, 25) : 0;
    const score = Math.min(Math.round(exceedPenalty + widthPenalty), 100);
    const details = `임계치 초과 ${exceedCount}건` + (maxWidthMm != null ? `, 최대 균열폭 ${maxWidthMm.toFixed(1)}mm` : '');
    return { score, details };
}
/**
 * IoT 센서 서브스코어 계산
 * - CRITICAL 이상 건수 × 30점 (cap: 90)
 * - WARNING 건수 × 10점 (cap: 30)
 */
function calcSensorScore(criticalReadings, warningReadings) {
    const score = Math.min(Math.round(Math.min(criticalReadings * 30, 90) + Math.min(warningReadings * 10, 30)), 100);
    const details = `센서 이상: 위험 ${criticalReadings}건 / 주의 ${warningReadings}건`;
    return { score, details };
}
/**
 * 민원 서브스코어 계산
 * - URGENT: 20점 / 건 (cap: 80)
 * - HIGH: 10점 / 건 (cap: 40)
 * - 미해결 비율 × 20점 추가
 */
function calcComplaintScore(openCount, urgentCount, highCount) {
    const score = Math.min(Math.round(Math.min(urgentCount * 20, 80) + Math.min(highCount * 10, 40)), 100);
    const details = `미해결 민원 ${openCount}건 (긴급 ${urgentCount} / 높음 ${highCount})`;
    return { score, details };
}
/**
 * 자산 노후도 서브스코어 계산
 * - 잔여수명 비율 기반: (1 - remainingRatio) × 100
 * - 점검 미수행 일수 추가 (90일 초과 시 +20)
 */
function calcAgeScore(ageYears, serviceLifeYears, lastInspectionDaysAgo) {
    let score = 0;
    let remainingLifeRatio;
    let details = '';
    if (ageYears != null && serviceLifeYears != null && serviceLifeYears > 0) {
        remainingLifeRatio = Math.max(0, 1 - ageYears / serviceLifeYears);
        score += Math.round((1 - remainingLifeRatio) * 80);
        details = `경과 ${ageYears}년 / 내용연수 ${serviceLifeYears}년 (잔여 ${Math.round(remainingLifeRatio * 100)}%)`;
    }
    if (lastInspectionDaysAgo != null && lastInspectionDaysAgo > 90) {
        score += Math.min(Math.round((lastInspectionDaysAgo - 90) / 10), 20);
        details += (details ? ', ' : '') + `마지막 점검 ${lastInspectionDaysAgo}일 경과`;
    }
    if (!details)
        details = '자산 노후도 정보 없음';
    return { score: Math.min(score, 100), details, remainingLifeRatio };
}
//# sourceMappingURL=risk-score.js.map