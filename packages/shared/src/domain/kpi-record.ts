// packages/shared/src/domain/kpi-record.ts
// Domain-layer types and calculation helpers for KPIRecord

export interface ComputeKpiInput {
  complexId: string;
  /** ISO date string, e.g. '2026-01-01' */
  periodStart: string;
  /** ISO date string, e.g. '2026-01-31' */
  periodEnd: string;
}

/**
 * KPI 목표값 (기준치 대비 달성 여부 평가)
 */
export interface KpiTarget {
  /** 민원 평균 처리 시간 목표: 67% 개선 시 ≤ 24h */
  complaintAvgProcessingHours: number;
  /** 점검 완료율 목표: ≥ 95% */
  inspectionCompletionRate: number;
  /** 결함 수리율 목표: ≥ 85% */
  defectRepairRate: number;
  /** 균열 경보 건수 목표: ≤ 2건 (월) */
  crackAlertCount: number;
  /** 예방 정비 비율: ≥ 30% */
  preventiveMaintenanceRatio: number;
}

export const DEFAULT_KPI_TARGETS: KpiTarget = {
  complaintAvgProcessingHours: 24,
  inspectionCompletionRate: 0.95,
  defectRepairRate: 0.85,
  crackAlertCount: 2,
  preventiveMaintenanceRatio: 0.3,
};

/**
 * KPI 달성 상태
 */
export type KpiStatus = 'ACHIEVED' | 'WARNING' | 'CRITICAL';

/** 목표값 대비 KPI 상태 계산 */
export function evaluateKpi(
  actual: number,
  target: number,
  direction: 'lower-is-better' | 'higher-is-better',
  warningThreshold = 0.1,
): KpiStatus {
  if (direction === 'lower-is-better') {
    if (actual <= target) return 'ACHIEVED';
    if (actual <= target * (1 + warningThreshold)) return 'WARNING';
    return 'CRITICAL';
  } else {
    if (actual >= target) return 'ACHIEVED';
    if (actual >= target * (1 - warningThreshold)) return 'WARNING';
    return 'CRITICAL';
  }
}

/**
 * 예방 정비 절감 추산 (간이 계산)
 * 공식: 예방점검으로 조기 발견된 결함 수 × 평균 긴급 보수 비용 × 예방 대비 긴급 비용 배율
 */
export function estimatePreventiveSavings(
  earlyFoundDefects: number,
  avgEmergencyRepairCostKRW = 2_000_000,
  preventiveToEmergencyRatio = 0.3,
): number {
  return Math.round(earlyFoundDefects * avgEmergencyRepairCostKRW * (1 - preventiveToEmergencyRatio));
}

/**
 * KPI 카드 표시용 요약
 */
export interface KpiCardData {
  id: string;
  label: string;
  value: number;
  unit: string;
  target?: number;
  status: KpiStatus;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  icon: string;
  description?: string;
}
