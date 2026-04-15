// packages/shared/src/domain/defect-media.ts
export { DefectMedia } from '../types/entities';

/** Step 1: Request body for POST /api/v1/media/upload/init */
export interface MediaUploadInitInput {
  fileName: string;       // original file name, e.g. "defect_001.jpg"
  mimeType: string;       // e.g. "image/jpeg"
  fileSize: number;       // bytes
  entityType: 'defect' | 'complaint' | 'workOrder';
  entityId: string;       // defect._id
  complexId: string;
}

/** Step 1 response: pre-signed PUT URL + mediaId */
export interface MediaUploadInitResult {
  mediaId: string;        // defectMedia._id to use in defect.mediaIds
  uploadUrl: string;      // S3 pre-signed PUT URL (10 min TTL)
  storageKey: string;     // S3 object key
}

/** Step 2: Request body for PATCH /api/v1/media/upload/:mediaId/complete */
export interface MediaUploadCompleteInput {
  capturedAt?: string;    // ISO timestamp from device EXIF
  gpsLat?: number;
  gpsLng?: number;
}

/**
 * Offline upload queue item — stored in PouchDB syncQueue collection.
 * Retried by SyncQueueService when network becomes available.
 */
export interface MediaQueueItem {
  _id: string;                  // syncQueue:{orgId}:mq_{timestamp}
  docType: 'syncQueue';
  queueType: 'mediaUpload';
  orgId: string;
  mediaId: string;              // defectMedia._id
  defectId: string;
  complexId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  blobKey: string;              // PouchDB attachment key on mediaId doc
  status: 'PENDING' | 'UPLOADING' | 'DONE' | 'ERROR';
  retryCount: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}
