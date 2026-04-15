export { DefectMedia } from '../types/entities';
/** Step 1: Request body for POST /api/v1/media/upload/init */
export interface MediaUploadInitInput {
    fileName: string;
    mimeType: string;
    fileSize: number;
    entityType: 'defect' | 'complaint' | 'workOrder';
    entityId: string;
    complexId: string;
}
/** Step 1 response: pre-signed PUT URL + mediaId */
export interface MediaUploadInitResult {
    mediaId: string;
    uploadUrl: string;
    storageKey: string;
}
/** Step 2: Request body for PATCH /api/v1/media/upload/:mediaId/complete */
export interface MediaUploadCompleteInput {
    capturedAt?: string;
    gpsLat?: number;
    gpsLng?: number;
}
/**
 * Offline upload queue item — stored in PouchDB syncQueue collection.
 * Retried by SyncQueueService when network becomes available.
 */
export interface MediaQueueItem {
    _id: string;
    docType: 'syncQueue';
    queueType: 'mediaUpload';
    orgId: string;
    mediaId: string;
    defectId: string;
    complexId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    blobKey: string;
    status: 'PENDING' | 'UPLOADING' | 'DONE' | 'ERROR';
    retryCount: number;
    lastAttemptAt: string | null;
    errorMessage: string | null;
    createdAt: string;
}
