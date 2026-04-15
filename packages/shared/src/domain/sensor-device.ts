// packages/shared/src/domain/sensor-device.ts
// Phase 2-8: IoT 센서 기기 도메인 타입 & 헬퍼

import { SensorType, SensorStatus } from '../types/enums';
import { SensorThreshold } from '../types/entities';

export interface CreateSensorDeviceInput {
  complexId: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  assetId?: string;
  name: string;
  deviceKey: string;
  sensorType: SensorType;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  thresholds: SensorThreshold;
  manufacturer?: string;
  model?: string;
  installDate?: string;
  batteryLevel?: number;
  firmwareVersion?: string;
  notes?: string;
}

export interface UpdateSensorDeviceInput {
  name?: string;
  status?: SensorStatus;
  locationDescription?: string;
  thresholds?: Partial<SensorThreshold>;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  assetId?: string;
  batteryLevel?: number;
  firmwareVersion?: string;
  isActive?: boolean;
  notes?: string;
}

export interface SensorDeviceFilterParams {
  complexId?: string;
  sensorType?: SensorType;
  status?: SensorStatus;
  buildingId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ── 레이블 & 표시 헬퍼 ─────────────────────────────────────────────────

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  [SensorType.TEMPERATURE]: '온도',
  [SensorType.HUMIDITY]:    '습도',
  [SensorType.VIBRATION]:   '진동',
  [SensorType.LEAK]:        '누수',
  [SensorType.POWER]:       '전력',
  [SensorType.CO2]:         '이산화탄소',
  [SensorType.PRESSURE]:    '압력',
  [SensorType.WATER_LEVEL]: '수위',
};

export const SENSOR_TYPE_ICONS: Record<SensorType, string> = {
  [SensorType.TEMPERATURE]: 'thermostat',
  [SensorType.HUMIDITY]:    'water_drop',
  [SensorType.VIBRATION]:   'vibration',
  [SensorType.LEAK]:        'water_damage',
  [SensorType.POWER]:       'bolt',
  [SensorType.CO2]:         'air',
  [SensorType.PRESSURE]:    'speed',
  [SensorType.WATER_LEVEL]: 'waves',
};

export const SENSOR_TYPE_UNITS: Record<SensorType, string> = {
  [SensorType.TEMPERATURE]: '°C',
  [SensorType.HUMIDITY]:    '%',
  [SensorType.VIBRATION]:   'mm/s',
  [SensorType.LEAK]:        '',
  [SensorType.POWER]:       'kW',
  [SensorType.CO2]:         'ppm',
  [SensorType.PRESSURE]:    'kPa',
  [SensorType.WATER_LEVEL]: '%',
};

export const SENSOR_STATUS_LABELS: Record<SensorStatus, string> = {
  [SensorStatus.ACTIVE]:      '정상',
  [SensorStatus.INACTIVE]:    '비활성',
  [SensorStatus.ERROR]:       '오류',
  [SensorStatus.MAINTENANCE]: '점검 중',
};

export const SENSOR_STATUS_COLORS: Record<SensorStatus, string> = {
  [SensorStatus.ACTIVE]:      '#2e7d32',
  [SensorStatus.INACTIVE]:    '#757575',
  [SensorStatus.ERROR]:       '#c62828',
  [SensorStatus.MAINTENANCE]: '#e65100',
};

// ── 센서 유형별 기본 임계치 ────────────────────────────────────────────

export const DEFAULT_SENSOR_THRESHOLDS: Record<SensorType, SensorThreshold> = {
  [SensorType.TEMPERATURE]: { unit: '°C',  warningMax: 30, criticalMax: 40, warningMin: 5,  criticalMin: 0 },
  [SensorType.HUMIDITY]:    { unit: '%',   warningMax: 70, criticalMax: 85, warningMin: 30, criticalMin: 20 },
  [SensorType.VIBRATION]:   { unit: 'mm/s',warningMax: 5,  criticalMax: 10 },
  [SensorType.LEAK]:        { unit: '',    criticalMax: 0.5 },  // 0.5 이상 = 누수 감지
  [SensorType.POWER]:       { unit: 'kW',  warningMax: 80, criticalMax: 100 },
  [SensorType.CO2]:         { unit: 'ppm', warningMax: 1000, criticalMax: 2000 },
  [SensorType.PRESSURE]:    { unit: 'kPa', warningMax: 110, criticalMax: 130, warningMin: 80, criticalMin: 60 },
  [SensorType.WATER_LEVEL]: { unit: '%',   warningMax: 70, criticalMax: 90 },
};
