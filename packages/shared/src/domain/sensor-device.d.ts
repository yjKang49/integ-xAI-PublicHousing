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
export declare const SENSOR_TYPE_LABELS: Record<SensorType, string>;
export declare const SENSOR_TYPE_ICONS: Record<SensorType, string>;
export declare const SENSOR_TYPE_UNITS: Record<SensorType, string>;
export declare const SENSOR_STATUS_LABELS: Record<SensorStatus, string>;
export declare const SENSOR_STATUS_COLORS: Record<SensorStatus, string>;
export declare const DEFAULT_SENSOR_THRESHOLDS: Record<SensorType, SensorThreshold>;
