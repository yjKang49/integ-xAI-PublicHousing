"use strict";
// packages/shared/src/domain/sensor-device.ts
// Phase 2-8: IoT 센서 기기 도메인 타입 & 헬퍼
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SENSOR_THRESHOLDS = exports.SENSOR_STATUS_COLORS = exports.SENSOR_STATUS_LABELS = exports.SENSOR_TYPE_UNITS = exports.SENSOR_TYPE_ICONS = exports.SENSOR_TYPE_LABELS = void 0;
const enums_1 = require("../types/enums");
// ── 레이블 & 표시 헬퍼 ─────────────────────────────────────────────────
exports.SENSOR_TYPE_LABELS = {
    [enums_1.SensorType.TEMPERATURE]: '온도',
    [enums_1.SensorType.HUMIDITY]: '습도',
    [enums_1.SensorType.VIBRATION]: '진동',
    [enums_1.SensorType.LEAK]: '누수',
    [enums_1.SensorType.POWER]: '전력',
    [enums_1.SensorType.CO2]: '이산화탄소',
    [enums_1.SensorType.PRESSURE]: '압력',
    [enums_1.SensorType.WATER_LEVEL]: '수위',
};
exports.SENSOR_TYPE_ICONS = {
    [enums_1.SensorType.TEMPERATURE]: 'thermostat',
    [enums_1.SensorType.HUMIDITY]: 'water_drop',
    [enums_1.SensorType.VIBRATION]: 'vibration',
    [enums_1.SensorType.LEAK]: 'water_damage',
    [enums_1.SensorType.POWER]: 'bolt',
    [enums_1.SensorType.CO2]: 'air',
    [enums_1.SensorType.PRESSURE]: 'speed',
    [enums_1.SensorType.WATER_LEVEL]: 'waves',
};
exports.SENSOR_TYPE_UNITS = {
    [enums_1.SensorType.TEMPERATURE]: '°C',
    [enums_1.SensorType.HUMIDITY]: '%',
    [enums_1.SensorType.VIBRATION]: 'mm/s',
    [enums_1.SensorType.LEAK]: '',
    [enums_1.SensorType.POWER]: 'kW',
    [enums_1.SensorType.CO2]: 'ppm',
    [enums_1.SensorType.PRESSURE]: 'kPa',
    [enums_1.SensorType.WATER_LEVEL]: '%',
};
exports.SENSOR_STATUS_LABELS = {
    [enums_1.SensorStatus.ACTIVE]: '정상',
    [enums_1.SensorStatus.INACTIVE]: '비활성',
    [enums_1.SensorStatus.ERROR]: '오류',
    [enums_1.SensorStatus.MAINTENANCE]: '점검 중',
};
exports.SENSOR_STATUS_COLORS = {
    [enums_1.SensorStatus.ACTIVE]: '#2e7d32',
    [enums_1.SensorStatus.INACTIVE]: '#757575',
    [enums_1.SensorStatus.ERROR]: '#c62828',
    [enums_1.SensorStatus.MAINTENANCE]: '#e65100',
};
// ── 센서 유형별 기본 임계치 ────────────────────────────────────────────
exports.DEFAULT_SENSOR_THRESHOLDS = {
    [enums_1.SensorType.TEMPERATURE]: { unit: '°C', warningMax: 30, criticalMax: 40, warningMin: 5, criticalMin: 0 },
    [enums_1.SensorType.HUMIDITY]: { unit: '%', warningMax: 70, criticalMax: 85, warningMin: 30, criticalMin: 20 },
    [enums_1.SensorType.VIBRATION]: { unit: 'mm/s', warningMax: 5, criticalMax: 10 },
    [enums_1.SensorType.LEAK]: { unit: '', criticalMax: 0.5 }, // 0.5 이상 = 누수 감지
    [enums_1.SensorType.POWER]: { unit: 'kW', warningMax: 80, criticalMax: 100 },
    [enums_1.SensorType.CO2]: { unit: 'ppm', warningMax: 1000, criticalMax: 2000 },
    [enums_1.SensorType.PRESSURE]: { unit: 'kPa', warningMax: 110, criticalMax: 130, warningMin: 80, criticalMin: 60 },
    [enums_1.SensorType.WATER_LEVEL]: { unit: '%', warningMax: 70, criticalMax: 90 },
};
//# sourceMappingURL=sensor-device.js.map