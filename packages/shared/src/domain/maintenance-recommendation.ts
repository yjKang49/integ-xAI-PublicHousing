// packages/shared/src/domain/maintenance-recommendation.ts
// Phase 2-9: 장기수선/예지정비 권장 도메인 타입 & 헬퍼

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

// ── 레이블 & 표시 헬퍼 ───────────────────────────────────────────────

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.IMMEDIATE_REPAIR]:      '즉시 보수',
  [MaintenanceType.SHORT_TERM_REPAIR]:     '단기 보수',
  [MaintenanceType.SCHEDULED_MAINTENANCE]: '계획 유지보수',
  [MaintenanceType.ROUTINE_INSPECTION]:    '일상 점검',
  [MaintenanceType.REPLACEMENT]:           '교체 (장기수선)',
};

export const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  [MaintenanceType.IMMEDIATE_REPAIR]:      '#880e4f',
  [MaintenanceType.SHORT_TERM_REPAIR]:     '#c62828',
  [MaintenanceType.SCHEDULED_MAINTENANCE]: '#f57c00',
  [MaintenanceType.ROUTINE_INSPECTION]:    '#2e7d32',
  [MaintenanceType.REPLACEMENT]:           '#4a148c',
};

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  [RecommendationStatus.PENDING]:     '검토 대기',
  [RecommendationStatus.APPROVED]:    '승인됨',
  [RecommendationStatus.IN_PROGRESS]: '진행 중',
  [RecommendationStatus.COMPLETED]:   '완료',
  [RecommendationStatus.DEFERRED]:    '연기됨',
  [RecommendationStatus.REJECTED]:    '반려됨',
};

// ── 비용 추정 밴드 ─────────────────────────────────────────────────────

export interface CostBand {
  min: number;
  max: number;
  currency: 'KRW';
  basis: string;
}

export const COST_BAND_BY_TYPE: Record<MaintenanceType, Omit<CostBand, 'currency'>> = {
  [MaintenanceType.IMMEDIATE_REPAIR]:      { min: 10_000_000, max: 50_000_000, basis: '긴급 보수 공사 실적 기반' },
  [MaintenanceType.SHORT_TERM_REPAIR]:     { min: 5_000_000,  max: 30_000_000, basis: '단기 보수 유사 공종 기반' },
  [MaintenanceType.SCHEDULED_MAINTENANCE]: { min: 1_000_000,  max: 15_000_000, basis: '계획 유지보수 단가 기반' },
  [MaintenanceType.ROUTINE_INSPECTION]:    { min: 100_000,    max: 1_000_000,  basis: '정기 점검 용역비 기반' },
  [MaintenanceType.REPLACEMENT]:           { min: 30_000_000, max: 200_000_000,basis: '장기수선계획 교체 단가 기반' },
};

// ── 위험도 → 권장 유지보수 유형 매핑 ────────────────────────────────────

export function riskLevelToMaintenanceType(level: RiskLevel, isEquipment = false): MaintenanceType {
  if (level === RiskLevel.CRITICAL) return isEquipment ? MaintenanceType.REPLACEMENT : MaintenanceType.IMMEDIATE_REPAIR;
  if (level === RiskLevel.HIGH)     return MaintenanceType.SHORT_TERM_REPAIR;
  if (level === RiskLevel.MEDIUM)   return MaintenanceType.SCHEDULED_MAINTENANCE;
  return MaintenanceType.ROUTINE_INSPECTION;
}

// ── 권장 일정 계산 ─────────────────────────────────────────────────────

export function calcSuggestedTimeline(level: RiskLevel): {
  earliest: string; latest: string; label: string;
} {
  const now = new Date();
  const add = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const config: Record<RiskLevel, { earliest: number; latest: number; label: string }> = {
    [RiskLevel.CRITICAL]: { earliest: 0,  latest: 30,  label: '즉시 (1개월 이내)' },
    [RiskLevel.HIGH]:     { earliest: 14, latest: 180, label: '단기 (3~6개월 이내)' },
    [RiskLevel.MEDIUM]:   { earliest: 30, latest: 365, label: '계획 (6~12개월 이내)' },
    [RiskLevel.LOW]:      { earliest: 90, latest: 400, label: '일상 (12개월 이내)' },
  };

  const c = config[level];
  return { earliest: add(c.earliest), latest: add(c.latest), label: c.label };
}

// ── 우선순위 매핑 ─────────────────────────────────────────────────────

export function riskLevelToPriority(level: RiskLevel): 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const map: Record<RiskLevel, 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
    [RiskLevel.CRITICAL]: 'IMMEDIATE',
    [RiskLevel.HIGH]:     'HIGH',
    [RiskLevel.MEDIUM]:   'MEDIUM',
    [RiskLevel.LOW]:      'LOW',
  };
  return map[level];
}

/** 비용 포맷 (KRW → 만원 표시) */
export function formatCostBand(band: CostBand): string {
  const toMan = (n: number) => (n / 10_000).toLocaleString('ko') + '만원';
  return `${toMan(band.min)} ~ ${toMan(band.max)}`;
}
