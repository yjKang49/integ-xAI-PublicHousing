import { SensorType, SensorReadingQuality } from '../types/enums';
import { SensorThreshold } from '../types/entities';
export interface IngestSensorReadingInput {
    deviceKey: string;
    value: number;
    recordedAt?: string;
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
    from?: string;
    to?: string;
    limit?: number;
}
export type ThresholdStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export declare function evaluateThreshold(value: number, thresholds: SensorThreshold): ThresholdStatus;
/** ThresholdStatus → SeverityLevel 매핑 (Alert 생성 시 사용) */
export declare const THRESHOLD_SEVERITY_MAP: {
    readonly WARNING: "HIGH";
    readonly CRITICAL: "CRITICAL";
};
export declare const THRESHOLD_STATUS_LABELS: Record<ThresholdStatus, string>;
export declare const THRESHOLD_STATUS_COLORS: Record<ThresholdStatus, string>;
export declare const READING_QUALITY_LABELS: Record<SensorReadingQuality, string>;
