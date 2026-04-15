import { RiskLevel, MaintenanceType, RecommendationStatus } from '../types/enums';
export interface RecommendationFilterParams {
    complexId?: string;
    targetId?: string;
    riskLevel?: RiskLevel;
    maintenanceType?: MaintenanceType;
    status?: RecommendationStatus;
    page?: number;
    limit?: number;
}
export declare const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string>;
export declare const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string>;
export declare const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string>;
export interface CostBand {
    min: number;
    max: number;
    currency: 'KRW';
    basis: string;
}
export declare const COST_BAND_BY_TYPE: Record<MaintenanceType, Omit<CostBand, 'currency'>>;
export declare function riskLevelToMaintenanceType(level: RiskLevel, isEquipment?: boolean): MaintenanceType;
export declare function calcSuggestedTimeline(level: RiskLevel): {
    earliest: string;
    latest: string;
    label: string;
};
export declare function riskLevelToPriority(level: RiskLevel): 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
/** 비용 포맷 (KRW → 만원 표시) */
export declare function formatCostBand(band: CostBand): string;
