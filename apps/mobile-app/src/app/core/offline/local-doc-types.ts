/**
 * local-doc-types.ts
 *
 * PouchDB local document types — superset of server CouchDB types.
 * Every local doc adds LocalMeta fields (syncStatus, localModifiedAt).
 *
 * Naming convention for _id:
 *   defect:{orgId}:def_{timestamp}_{uuid8}
 *   defectMedia:{orgId}:img_{timestamp}_{uuid8}
 *   syncQueue:{orgId}:mq_{timestamp}_{uuid8}
 */

import { Defect, DefectMedia } from '@ax/shared';

// ─────────────────────────────────────────────────────────────────
// Offline sync metadata (mixed into every locally-created doc)
// ─────────────────────────────────────────────────────────────────

export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'ERROR';

export interface LocalMeta {
  /** Set to PENDING on create/update; updated to SYNCED after CouchDB confirms */
  syncStatus: SyncStatus;
  /** ISO timestamp of last local modification — used for conflict resolution */
  localModifiedAt: string;
}

/** Generic wrapper: any server type extended with offline metadata */
export type LocalDoc<T> = T & LocalMeta & { _rev?: string };

// ─────────────────────────────────────────────────────────────────
// Local Defect
// ─────────────────────────────────────────────────────────────────

export type LocalDefect = LocalDoc<Defect>;

// ─────────────────────────────────────────────────────────────────
// Local DefectMedia
// ─────────────────────────────────────────────────────────────────

/** DefectMedia stored locally before S3 upload.
 *  storageKey is empty until the server processes the PouchDB attachment. */
export type LocalDefectMedia = LocalDoc<DefectMedia> & {
  /**
   * PouchDB attachment key (fileName) used to retrieve the blob.
   * Set during offline save; cleared once upload to S3 is confirmed.
   */
  attachmentKey?: string;
  /** Upload phase tracked locally */
  uploadStatus: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'ERROR';
};

// ─────────────────────────────────────────────────────────────────
// Sync Queue Item (media upload retry queue)
// ─────────────────────────────────────────────────────────────────

export interface SyncQueueItem {
  _id: string;                    // syncQueue:{orgId}:mq_{ts}_{uuid8}
  _rev?: string;
  docType: 'syncQueue';
  queueType: 'mediaUpload';
  orgId: string;
  mediaId: string;                // defectMedia._id
  defectId: string;
  complexId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** PouchDB attachment key stored on the defectMedia doc */
  attachmentKey: string;
  status: 'PENDING' | 'UPLOADING' | 'DONE' | 'ERROR';
  retryCount: number;
  maxRetries: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  syncStatus: SyncStatus;
  localModifiedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// Mango index definitions — created on PouchDB init
// ─────────────────────────────────────────────────────────────────

export const LOCAL_INDEXES: PouchDB.Find.CreateIndexOptions[] = [
  // Sessions by complex + date
  { index: { fields: ['docType', 'complexId', 'createdAt'] } },
  // Defects by session + severity
  { index: { fields: ['docType', 'sessionId', 'severity'] } },
  // All pending sync items
  { index: { fields: ['docType', 'syncStatus'] } },
  // Media by defect
  { index: { fields: ['docType', 'defectId', 'capturedAt'] } },
  // Sync queue by status
  { index: { fields: ['docType', 'queueType', 'status'] } },
  // Markers by building
  { index: { fields: ['docType', 'buildingId', 'isVisible'] } },
];
