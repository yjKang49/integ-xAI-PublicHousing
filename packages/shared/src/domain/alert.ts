// packages/shared/src/domain/alert.ts
// Domain-layer helpers and input types for Alert

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
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'crack-threshold-exceeded',
    name: '균열 임계치 초과',
    description: '측정값이 게이지 포인트의 경보 임계치(thresholdMm)를 초과할 때 HIGH 경보 발령',
    alertType: AlertType.CRACK_THRESHOLD,
    condition: { field: 'measuredWidthMm', operator: 'gte', value: 'thresholdMm' },
    severity: SeverityLevel.HIGH,
    isActive: true,
  },
  {
    id: 'crack-critical-threshold',
    name: '균열 긴급 임계치 초과 (thresholdMm × 1.5)',
    description: '측정값이 임계치의 1.5배를 초과할 때 CRITICAL 경보 발령',
    alertType: AlertType.CRACK_THRESHOLD,
    condition: { field: 'measuredWidthMm', operator: 'gte', value: 'thresholdMm * 1.5' },
    severity: SeverityLevel.CRITICAL,
    isActive: true,
  },
  {
    id: 'inspection-overdue',
    name: '점검 미수행',
    description: '예정일로부터 7일 경과 후에도 점검이 완료되지 않은 경우',
    alertType: AlertType.INSPECTION_OVERDUE,
    condition: { field: 'daysOverdue', operator: 'gte', value: 7 },
    severity: SeverityLevel.MEDIUM,
    isActive: true,
  },
  {
    id: 'contract-expiry-warning',
    name: '계약 만료 30일 전',
    description: '계약 만료일 30일 전 경고 알림',
    alertType: AlertType.CONTRACT_EXPIRY,
    condition: { field: 'daysUntilExpiry', operator: 'lte', value: 30 },
    severity: SeverityLevel.MEDIUM,
    isActive: true,
  },
];
