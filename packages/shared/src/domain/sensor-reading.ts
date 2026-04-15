// packages/shared/src/domain/sensor-reading.ts
// Phase 2-8: IoT 센서 측정값 도메인 타입 & 헬퍼

import { SensorType, SensorReadingQuality } from '../types/enums';
import { SensorThreshold } from '../types/entities';

export interface IngestSensorReadingInput {
  deviceKey: string;        // 센서 기기 식별자 (SensorDevice.deviceKey)
  value: number;
  recordedAt?: string;      // ISO 타임스탬프 (미입력 시 서버 수신 시각 사용)
  quality?: SensorReadingQuality;
  rawPayload?: Record<string, unknown>;
}

/** batch ingest — 여러 센서 값을 한 번에 전송 */
export interface BatchIngestInput {
  readings: IngestSensorReadingInput[];
}

export interface SensorReadingFilterParams {
  deviceId?: string;
  deviceKey?: string;
  complexId?: string;
  sensorType?: SensorType;
  from?: string;  // ISO datetime
  to?: string;    // ISO datetime
  limit?: number;
}

// ── 임계치 평가 헬퍼 ──────────────────────────────────────────────────

export type ThresholdStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export function evaluateThreshold(value: number, thresholds: SensorThreshold): ThresholdStatus {
  const { criticalMin, criticalMax, warningMin, warningMax } = thresholds;

  if (criticalMax !== undefined && value > criticalMax) return 'CRITICAL';
  if (criticalMin !== undefined && value < criticalMin) return 'CRITICAL';
  if (warningMax  !== undefined && value > warningMax)  return 'WARNING';
  if (warningMin  !== undefined && value < warningMin)  return 'WARNING';
  return 'NORMAL';
}

/** ThresholdStatus → SeverityLevel 매핑 (Alert 생성 시 사용) */
export const THRESHOLD_SEVERITY_MAP = {
  WARNING:  'HIGH',     // SeverityLevel.HIGH
  CRITICAL: 'CRITICAL', // SeverityLevel.CRITICAL
} as const;

export const THRESHOLD_STATUS_LABELS: Record<ThresholdStatus, string> = {
  NORMAL:   '정상',
  WARNING:  '주의',
  CRITICAL: '위험',
};

export const THRESHOLD_STATUS_COLORS: Record<ThresholdStatus, string> = {
  NORMAL:   '#2e7d32',
  WARNING:  '#f57c00',
  CRITICAL: '#c62828',
};

export const READING_QUALITY_LABELS: Record<SensorReadingQuality, string> = {
  [SensorReadingQuality.GOOD]: '정상',
  [SensorReadingQuality.FAIR]: '보통',
  [SensorReadingQuality.POOR]: '불량',
};
