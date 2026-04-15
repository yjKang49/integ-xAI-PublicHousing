import { RiskLevel, RiskTargetType } from '../types/enums';
export interface RiskScoreFilterParams {
    complexId?: string;
    targetType?: RiskTargetType;
    targetId?: string;
    level?: RiskLevel;
    isLatest?: boolean;
    page?: number;
    limit?: number;
}
export interface TriggerRiskCalculationInput {
    complexId: string;
    targetType: RiskTargetType;
    targetId: string;
    targetName: string;
}
export declare function scoreToLevel(score: number): RiskLevel;
export declare const RISK_LEVEL_LABELS: Record<RiskLevel, string>;
export declare const RISK_LEVEL_COLORS: Record<RiskLevel, string>;
export declare const RISK_LEVEL_BG: Record<RiskLevel, string>;
export declare const RISK_TARGET_TYPE_LABELS: Record<RiskTargetType, string>;
export declare const RISK_WEIGHTS: {
    readonly defect: 0.3;
    readonly crack: 0.25;
    readonly sensor: 0.2;
    readonly complaint: 0.15;
    readonly age: 0.1;
};
/**
 * 결함 서브스코어 계산
 * - CRITICAL: 30점 / 개 (cap: 90)
 * - HIGH: 15점 / 개 (cap: 60)
 * - MEDIUM: 5점 / 개 (cap: 30)
 * - 미수리 비율 × 20점 추가
 */
export declare function calcDefectScore(unrepairedCount: number, criticalCount: number, highCount: number, mediumCount: number, totalCount: number): {
    score: number;
    details: string;
};
/**
 * 균열 서브스코어 계산
 * - 임계치 초과 건수 × 25점 (cap: 75)
 * - 최대 균열폭 기반 추가 (1mm 초과 시 +25)
 */
export declare function calcCrackScore(exceedCount: number, maxWidthMm?: number): {
    score: number;
    details: string;
};
/**
 * IoT 센서 서브스코어 계산
 * - CRITICAL 이상 건수 × 30점 (cap: 90)
 * - WARNING 건수 × 10점 (cap: 30)
 */
export declare function calcSensorScore(criticalReadings: number, warningReadings: number): {
    score: number;
    details: string;
};
/**
 * 민원 서브스코어 계산
 * - URGENT: 20점 / 건 (cap: 80)
 * - HIGH: 10점 / 건 (cap: 40)
 * - 미해결 비율 × 20점 추가
 */
export declare function calcComplaintScore(openCount: number, urgentCount: number, highCount: number): {
    score: number;
    details: string;
};
/**
 * 자산 노후도 서브스코어 계산
 * - 잔여수명 비율 기반: (1 - remainingRatio) × 100
 * - 점검 미수행 일수 추가 (90일 초과 시 +20)
 */
export declare function calcAgeScore(ageYears?: number, serviceLifeYears?: number, lastInspectionDaysAgo?: number): {
    score: number;
    details: string;
    remainingLifeRatio?: number;
};
