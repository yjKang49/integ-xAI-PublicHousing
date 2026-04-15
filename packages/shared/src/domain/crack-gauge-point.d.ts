export interface CreateCrackGaugePointInput {
    complexId: string;
    buildingId: string;
    floorId?: string;
    zoneId?: string;
    /** 게이지 포인트 명칭 (예: "101동 계단실 A 균열 #1") */
    name: string;
    description: string;
    /** 설치일 (ISO 날짜) */
    installDate: string;
    /** 설치 시 기준 균열 폭 (mm) */
    baselineWidthMm: number;
    /** 경보 발령 임계치 (mm) — 이 값 초과 시 Alert 자동 생성 */
    thresholdMm: number;
    /** 현장 위치 설명 (예: "지상 1층 북측 계단실 벽면") */
    location: string;
}
export interface UpdateCrackGaugePointInput {
    name?: string;
    description?: string;
    thresholdMm?: number;
    isActive?: boolean;
}
/**
 * 게이지 포인트 상태 요약 — 대시보드 및 목록 UI용
 */
export interface GaugePointSummary {
    gaugePointId: string;
    name: string;
    location: string;
    baselineWidthMm: number;
    thresholdMm: number;
    latestWidthMm: number | null;
    changeFromBaselineMm: number | null;
    exceedsThreshold: boolean;
    /** 임계치의 80% 이상이면 warning */
    isWarning: boolean;
    lastMeasuredAt: string | null;
    measurementCount: number;
    trend: 'STABLE' | 'INCREASING' | 'DECREASING';
}
