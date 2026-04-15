export declare enum DroneMissionStatus {
    CREATED = "CREATED",// 미션 생성됨 (파일 없음)
    UPLOADING = "UPLOADING",// 파일 업로드 진행 중
    UPLOADED = "UPLOADED",// 모든 파일 업로드 완료, 처리 대기
    PROCESSING = "PROCESSING",// 프레임 추출 / AI 분석 진행 중
    COMPLETED = "COMPLETED",// 분석 완료
    FAILED = "FAILED"
}
export declare enum DroneMediaItemStatus {
    PENDING = "PENDING",// 업로드 대기 (pre-signed URL 발급됨)
    UPLOADED = "UPLOADED",// S3 업로드 완료
    EXTRACTING = "EXTRACTING",// 프레임 추출 / 메타데이터 추출 중
    DONE = "DONE",// 처리 완료
    FAILED = "FAILED"
}
export type DroneMediaItemType = 'VIDEO' | 'IMAGE';
export interface GpsPoint {
    lat: number;
    lng: number;
    alt?: number;
    timestamp?: string;
}
export interface DroneMissionMedia {
    mediaItemId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    mediaType: DroneMediaItemType;
    storageKey: string;
    status: DroneMediaItemStatus;
    uploadedAt?: string;
    capturedAt?: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsAlt?: number;
    /** 영상일 경우 추출된 프레임 수 */
    frameCount?: number;
    /** 메타데이터 추출 결과 */
    metadata?: VideoMeta | ImageMeta;
    /** 연관 Job ID (프레임 추출 / 메타데이터 추출) */
    extractionJobId?: string;
}
export interface VideoMeta {
    durationSec: number;
    fps: number;
    width: number;
    height: number;
    codec?: string;
    bitratekbps?: number;
}
export interface ImageMeta {
    width: number;
    height: number;
    dpi?: number;
    colorSpace?: string;
    /** EXIF 원본 데이터 (선택적 — 대용량이므로 축약) */
    exif?: Record<string, string | number>;
}
export interface DroneMission {
    _id: string;
    _rev?: string;
    docType: 'droneMission';
    orgId: string;
    complexId: string;
    buildingId?: string;
    sessionId?: string;
    title: string;
    description?: string;
    status: DroneMissionStatus;
    pilot: string;
    flightDate: string;
    droneModel?: string;
    weatherCondition?: string;
    /** 업로드된 미디어 항목 목록 (영상 + 이미지 혼합 가능) */
    mediaItems: DroneMissionMedia[];
    /** 연관 비동기 Job ID 목록 (프레임 추출, AI 분석 등) */
    jobIds: string[];
    /** 추출 완료된 총 프레임 수 */
    totalFrameCount?: number;
    /** AI 탐지된 결함 수 */
    detectionCount?: number;
    /** 비행 경로 GPS 좌표 목록 */
    gpsTrack?: GpsPoint[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export interface CreateDroneMissionInput {
    complexId: string;
    buildingId?: string;
    sessionId?: string;
    title: string;
    description?: string;
    pilot: string;
    flightDate: string;
    droneModel?: string;
    weatherCondition?: string;
    gpsTrack?: GpsPoint[];
}
export interface InitDroneMediaUploadInput {
    fileName: string;
    mimeType: string;
    fileSize: number;
    mediaType: DroneMediaItemType;
    capturedAt?: string;
}
export interface InitDroneMediaUploadResult {
    mediaItemId: string;
    uploadUrl: string;
    storageKey: string;
}
export interface CompleteDroneMediaUploadInput {
    capturedAt?: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsAlt?: number;
}
