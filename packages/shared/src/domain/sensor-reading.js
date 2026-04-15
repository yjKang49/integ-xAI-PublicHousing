"use strict";
// packages/shared/src/domain/sensor-reading.ts
// Phase 2-8: IoT 센서 측정값 도메인 타입 & 헬퍼
Object.defineProperty(exports, "__esModule", { value: true });
exports.READING_QUALITY_LABELS = exports.THRESHOLD_STATUS_COLORS = exports.THRESHOLD_STATUS_LABELS = exports.THRESHOLD_SEVERITY_MAP = void 0;
exports.evaluateThreshold = evaluateThreshold;
const enums_1 = require("../types/enums");
function evaluateThreshold(value, thresholds) {
    const { criticalMin, criticalMax, warningMin, warningMax } = thresholds;
    if (criticalMax !== undefined && value > criticalMax)
        return 'CRITICAL';
    if (criticalMin !== undefined && value < criticalMin)
        return 'CRITICAL';
    if (warningMax !== undefined && value > warningMax)
        return 'WARNING';
    if (warningMin !== undefined && value < warningMin)
        return 'WARNING';
    return 'NORMAL';
}
/** ThresholdStatus → SeverityLevel 매핑 (Alert 생성 시 사용) */
exports.THRESHOLD_SEVERITY_MAP = {
    WARNING: 'HIGH', // SeverityLevel.HIGH
    CRITICAL: 'CRITICAL', // SeverityLevel.CRITICAL
};
exports.THRESHOLD_STATUS_LABELS = {
    NORMAL: '정상',
    WARNING: '주의',
    CRITICAL: '위험',
};
exports.THRESHOLD_STATUS_COLORS = {
    NORMAL: '#2e7d32',
    WARNING: '#f57c00',
    CRITICAL: '#c62828',
};
exports.READING_QUALITY_LABELS = {
    [enums_1.SensorReadingQuality.GOOD]: '정상',
    [enums_1.SensorReadingQuality.FAIR]: '보통',
    [enums_1.SensorReadingQuality.POOR]: '불량',
};
//# sourceMappingURL=sensor-reading.js.map