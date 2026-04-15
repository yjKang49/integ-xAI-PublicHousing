import { AlertType, AlertStatus, SeverityLevel } from '../types/enums';
export interface CreateAlertInput {
    complexId: string;
    alertType: AlertType;
    severity: SeverityLevel;
    title: string;
    message: string;
    sourceEntityType: string;
    sourceEntityId: string;
    assignedTo?: string[];
    expiresAt?: string;
}
export interface AlertFilterParams {
    status?: AlertStatus;
    severity?: SeverityLevel;
    alertType?: AlertType;
    complexId?: string;
    page?: number;
    limit?: number;
}
/**
 * 알림 심각도별 카운트 (대시보드용)
 */
export type AlertSeverityCount = Record<SeverityLevel, number>;
/**
 * 경보 규칙 정의 — 향후 규칙 엔진 확장 포인트
 */
export interface AlertRule {
    id: string;
    name: string;
    description: string;
    alertType: AlertType;
    /** 트리거 조건 — 예: { field: 'measuredWidthMm', operator: 'gte', value: 'thresholdMm' } */
    condition: {
        field: string;
        operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
        /** 고정값 또는 다른 필드 참조 (e.g., 'thresholdMm') */
        value: number | string;
    };
    severity: SeverityLevel;
    isActive: boolean;
}
/**
 * 기본 경보 규칙 세트
 */
export declare const DEFAULT_ALERT_RULES: AlertRule[];
