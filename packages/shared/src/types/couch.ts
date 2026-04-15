// ============================================================
// packages/shared/src/types/couch.ts
// CouchDB document base types and conventions
// ============================================================

/**
 * Every CouchDB document extends this base.
 * _id convention: {docType}:{orgId}:{uuid}
 *   e.g. defect:org_001:def_20240101_abc123
 *
 * Database naming: ax_{orgId}_{env}
 *   e.g. ax_org001_prod, ax_org001_dev
 *
 * Replication: per-org filtered replication to mobile client
 */
export interface CouchDocument {
  _id: string;
  _rev?: string;
  docType: string;     // discriminator — matches entity name
  orgId: string;       // tenant isolation key
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  createdBy: string;   // userId
  updatedBy: string;   // userId
  _deleted?: boolean;  // soft-delete via CouchDB tombstone
}

/**
 * Mobile PouchDB documents additionally carry sync metadata
 */
export interface PouchSyncMeta {
  syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
  localModifiedAt?: string;
  conflictBase?: string;  // _rev of conflicting ancestor
}

/**
 * CouchDB design document structure for views
 */
export interface CouchDesignDoc {
  _id: string;          // _design/{name}
  views: Record<string, {
    map: string;
    reduce?: string;
  }>;
  indexes?: Record<string, {
    index: { fields: string[] };
    ddoc?: string;
    type?: string;
  }>;
}
